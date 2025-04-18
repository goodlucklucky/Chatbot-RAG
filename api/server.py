import os
import time
import hashlib
import pytesseract
from PIL import Image
from langchain_core.documents import Document
from langchain_community.document_loaders import PyPDFLoader
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

def load_documents(file_path: str):
    if file_path.lower().endswith(".pdf"):
        loader = PyPDFLoader(file_path)
        return loader.load()
    elif file_path.lower().endswith((".png", ".jpg", ".jpeg")):
        print("Using OCR to extract text from image")
        image = Image.open(file_path)
        text = pytesseract.image_to_string(image)
        return [Document(page_content=text, metadata={"source": file_path})]
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
    for message_chunk, metadata in agent_executor.stream(
        {"messages": [HumanMessage(content=question)]}, config=config, stream_mode="messages"
    ):
        if message_chunk.content and metadata["langgraph_node"] == "agent":
            yield f"{message_chunk.content}"
