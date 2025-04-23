import os
import io
import time
import hashlib
import pytesseract
from PIL import Image
import pymupdf
import markdown2
from bs4 import BeautifulSoup
from docx import Document as DocxDocument
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain.chat_models import init_chat_model
from langchain_core.messages import HumanMessage
from langchain_openai import OpenAIEmbeddings
from pinecone import Pinecone, ServerlessSpec
from langchain_pinecone import PineconeVectorStore
from langgraph.checkpoint.memory import MemorySaver
from langgraph.prebuilt import create_react_agent
from langchain.tools.retriever import create_retriever_tool

memory = MemorySaver()
llm = init_chat_model("gpt-4o-mini", model_provider="openai")
embeddings = OpenAIEmbeddings(model="text-embedding-3-large")

# Pinecone implementation
pinecone_api_key = os.environ.get("PINECONE_API_KEY")

pc = Pinecone(api_key=pinecone_api_key)

def save_docx_file(content: str, user_id: str) -> str:
    filename = f"{user_id}_{int(time.time())}.docx"
    doc_path = os.path.join("downloads", filename)
    os.makedirs("downloads", exist_ok=True)

    # Convert markdown to HTML
    html = markdown2.markdown(content)
    soup = BeautifulSoup(html, "html.parser")

    doc = DocxDocument()

    for element in soup:
        if element.name == "h1":
            doc.add_heading(element.text, level=1)
        elif element.name == "h2":
            doc.add_heading(element.text, level=2)
        elif element.name == "ul":
            for li in element.find_all("li"):
                doc.add_paragraph(li.text, style='List Bullet')
        elif element.name == "ol":
            for li in element.find_all("li"):
                doc.add_paragraph(li.text, style='List Number')
        elif element.name == "p":
            para = doc.add_paragraph()
            # Check for inline formatting (bold, italic, code)
            for child in element.children:
                if isinstance(child, str):
                    para.add_run(child)
                elif child.name == "strong":  # Bold
                    para.add_run(child.text).bold = True
                elif child.name == "em":  # Italic
                    para.add_run(child.text).italic = True
                elif child.name == "code":  # Code
                    para.add_run(child.text).font.name = 'Courier New'
                    para.add_run(child.text).font.size = Pt(10)

        else:
            # For any other HTML element, just add the text
            doc.add_paragraph(element.text)

    doc.save(doc_path)
    current_doc_path = os.path.join("downloads", f"{user_id}_current.docx")
    doc.save(current_doc_path)

    # Replace with your actual base URL
    return f"{os.environ.get('BASE_URL', 'http://localhost:5000')}/downloads/{filename}"

def load_documents(file_path: str):
    if file_path.lower().endswith(".pdf"):
        docs = []

        # If there are images in the PDF, process them using OCR
        print("Extracting images from PDF and performing OCR...")
        doc = pymupdf.open(file_path)
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)

            # Extract text from the page
            text = page.get_text()
            docs.append(Document(page_content=text))

            # Extract images from the page
            img_list = page.get_images(full=True)
            for img_index, img in enumerate(img_list):
                xref = img[0]
                base_image = doc.extract_image(xref)
                image_bytes = base_image["image"]

                # Convert image bytes to PIL Image for OCR
                image = Image.open(io.BytesIO(image_bytes))

                # Run OCR on the image
                text_from_image = pytesseract.image_to_string(image)

                # Optionally, append OCR-extracted text as a document
                docs.append(Document(page_content=text_from_image))

        return docs
    elif file_path.lower().endswith((".png", ".jpg", ".jpeg")):
        print("Using OCR to extract text from image")
        image = Image.open(file_path)
        text = pytesseract.image_to_string(image)
        return [Document(page_content=text)]
    else:
        print("Unsupported file format")
        return []

def invoke_stream(question: str, user_id: str, file_path: str):
    if os.path.exists(file_path):
        print("Loading and chunking contents of the file")
        docs = load_documents(file_path)
    else:
        docs = []

    index_name = hashlib.md5(user_id.encode()).hexdigest()
    print(index_name)
    existing_indexes = [index_info["name"] for index_info in pc.list_indexes()]

    if index_name not in existing_indexes:
        pc.create_index(
            name=index_name,
            dimension=3072,
            metric="cosine",
            spec=ServerlessSpec(cloud="aws", region="us-east-1"),
        )
        while not pc.describe_index(index_name).status["ready"]:
            time.sleep(1)

    index = pc.Index(index_name)

    vector_store = PineconeVectorStore(index=index, embedding=embeddings)

    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1024, chunk_overlap=200)
    all_splits = text_splitter.split_documents(docs)

    # Update metadata (illustration purposes)
    total_documents = len(all_splits)
    third = total_documents // 3

    for i, document in enumerate(all_splits):
        if i < third:
            document.metadata["section"] = "beginning"
        elif i < 2 * third:
            document.metadata["section"] = "middle"
        else:
            document.metadata["section"] = "end"


    print("Indexing chunks")
    _ = vector_store.add_documents(all_splits)
    print("Indexing finished!")

    retriever = vector_store.as_retriever()

    ### Build retriever tool ###
    tool = create_retriever_tool(
        retriever,
        index_name,
        "Independent chat room"
    )
    tools = [tool]

    agent_executor = create_react_agent(llm, tools, checkpointer=memory)
    config = {"configurable": {"thread_id": index_name}}

    full_content = ""  # <-- Accumulate content here
    guide = (
        "If the user wants to generate a document file, "
        "include ONLY the formal document content between the --- and --- markers. "
        "Do NOT break the markers across multiple tokens or stream them character-by-character. "
        "Only wrap formal document content in these markers. Keep anything else outside."
        "Format the document with proper headings, bullet points, or numbered sections if needed. "
    )
    prompt = guide + question
    doc_writing_flag = False

    for message_chunk, metadata in agent_executor.stream(
        {"messages": [HumanMessage(content=prompt)]}, config=config, stream_mode="messages"
    ):
        if message_chunk.content and metadata["langgraph_node"] == "agent":
            content = message_chunk.content
            if "---" == content.strip() and doc_writing_flag:
                doc_writing_flag = False
                download_url = save_docx_file(full_content.strip(), user_id)
                download_link = f'\n📄 Download your DOCX({download_url})'
                full_content = ""
                yield download_link

            if doc_writing_flag:
                full_content += content
            elif "---" != content.strip():
                yield content

            if "---" == content.strip() and doc_writing_flag == False:
                doc_writing_flag = True
