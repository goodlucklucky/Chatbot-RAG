from typing import Literal
import os
import time
import hashlib
from langchain import hub
from langchain_community.document_loaders import PyPDFLoader
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langgraph.graph import START, StateGraph
from typing_extensions import Annotated, List, TypedDict
from langchain.chat_models import init_chat_model
from langchain_openai import OpenAIEmbeddings
from pinecone import Pinecone, ServerlessSpec
from langchain_pinecone import PineconeVectorStore

llm = init_chat_model("gpt-4o-mini", model_provider="openai")
embeddings = OpenAIEmbeddings(model="text-embedding-3-large")

# Pinecone implementation
pinecone_api_key = os.environ.get("PINECONE_API_KEY")

pc = Pinecone(api_key=pinecone_api_key)

print("Define schema for search")
class Search(TypedDict):
    """Search query."""

    query: Annotated[str, ..., "Search query to run."]
    section: Annotated[
        Literal["beginning", "middle", "end"],
        ...,
        "Section to query.",
    ]

# Define prompt for question-answering
prompt = hub.pull("rlm/rag-prompt")


# Define state for application
class State(TypedDict):
    question: str
    query: Search
    context: List[Document]
    answer: str
    vector_store: PineconeVectorStore


def analyze_query(state: State):
    structured_llm = llm.with_structured_output(Search)
    query = structured_llm.invoke(state["question"])
    return {"query": query}


def retrieve(state: State):
    query = state["query"]
    store = state["vector_store"]
    retrieved_docs = store.similarity_search_with_score(
        query["query"],
        k=10,
        filter={"section": {"$eq": query["section"]}},
    )
    filtered_above = [doc for doc, score in retrieved_docs if score > 0.5]
    return {"context": filtered_above}


def generate(state: State):
    docs_content = "\n\n".join(doc.page_content for doc in state["context"])
    messages = prompt.invoke({"question": state["question"], "context": docs_content})
    response = llm.invoke(messages)
    return {"answer": response.content}


graph_builder = StateGraph(State).add_sequence([analyze_query, retrieve, generate])
graph_builder.add_edge(START, "analyze_query")
graph = graph_builder.compile()

def invoke(question: str, user_id: str, file_path: str):
    if os.path.exists(file_path):
        print("Loading and chunking contents of the file")
        loader = PyPDFLoader(file_path)
        docs = loader.load()
    else:
        loader = None
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

    response = graph.invoke({
        "question": question,
        "vector_store": vector_store
    })
    return response["answer"]
