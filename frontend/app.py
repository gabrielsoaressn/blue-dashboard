import streamlit as st
import os
import asyncio
from datetime import datetime
from dotenv import load_dotenv

# Import services and components
from services.api_client import ApiClient, ApiConnectionError, ApiValidationError, ApiServerError
from components.file_upload import render_file_upload
from components.task_display import render_task_list
from components.statistics import render_statistics

# --- Page Configuration ---
st.set_page_config(
    page_title="Blue Dashboard - Task Extractor",
    page_icon="🔵",
    layout="wide"
)

# --- Load Environment Variables & Initialize API Client ---
load_dotenv(dotenv_path='.env')
API_BASE_URL = os.getenv("API_BASE_URL", "http://127.0.0.1:3000/api") # Ensure this matches backend port
api_client = ApiClient(base_url=API_BASE_URL)

# --- Custom Styling ---
def load_css():
    st.markdown("""<style>
    .stTabs [data-baseweb="tab-list"] { gap: 2px; }
    .stTabs [data-baseweb="tab"] {
        height: 50px; white-space: pre-wrap; background-color: #F0F2F6;
        border-radius: 4px 4px 0px 0px; gap: 1px; padding-top: 10px; padding-bottom: 10px;
    }
    .stTabs [aria-selected="true"] { background-color: #FFFFFF; }
    .stButton>button {
        width: 100%; background-color: #0068C9; color: white;
    }
    .stButton>button:hover { background-color: #0055A4; color: white; }
    </style>""", unsafe_allow_html=True)

load_css()

# --- Session State Initialization ---
if 'results' not in st.session_state:
    st.session_state.results = None
if 'error' not in st.session_state:
    st.session_state.error = None
if 'processing' not in st.session_state:
    st.session_state.processing = False
if 'history' not in st.session_state:
    st.session_state.history = []

# --- Main Application Logic ---
async def process_data(source_type, data, name=None):
    """Helper to call the API and handle state."""
    st.session_state.processing = True
    st.session_state.results = None
    st.session_state.error = None
    
    try:
        with st.spinner('Processando documento e extraindo tarefas...'):
            if source_type == 'file':
                # Streamlit's UploadedFile object has .name and .getvalue()
                file_content = data.getvalue()
                result = await api_client.upload_file(file_content, data.name)
            elif source_type == 'text':
                result = await api_client.process_text(data, name)
        
        st.session_state.results = result
        st.session_state.history.append({
            "timestamp": st.session_state.get('current_time', 'N/A'),
            "document_name": name or data.name,
            "tasks_count": len(result.get('tasks', [])),
            "results": result # Store full results for re-display
        })
        st.success("Documento processado com sucesso!")

    except (ApiConnectionError, ApiValidationError, ApiServerError) as e:
        st.session_state.error = str(e)
        st.error(f"Erro ao processar: {e}")
    except Exception as e:
        st.session_state.error = f"Um erro inesperado ocorreu: {e}"
        st.error(f"Erro inesperado: {e}")
    finally:
        st.session_state.processing = False
        # st.experimental_rerun() # Rerun is not needed here, Streamlit handles it

# --- UI Layout ---

# Sidebar
with st.sidebar:
    st.title("🔵 Blue Dashboard")
    st.info("Extraia tarefas de documentos usando IA. Faça o upload de um arquivo ou cole o texto diretamente.")
    
    # Dark/Light Mode Toggle (Streamlit handles this natively in settings, but a custom button could be added)
    st.markdown("**Modo de Exibição:**")
    st.write("Use as configurações do Streamlit (☰ > Settings) para alternar entre os modos claro/escuro.")

    if st.button("Verificar Status da API"):
        try:
            status = asyncio.run(api_client.health_check())
            st.success(f"API Status: **{status.get('status', 'N/A')}** - {status.get('timestamp', 'N/A')}")
        except ApiConnectionError:
            st.error("API indisponível. Verifique se o backend está rodando.")

# Main Content
st.title("Extrator de Tarefas com IA")

# Tabs
tab_upload, tab_results, tab_history, tab_stats = st.tabs(["📤 Upload", "📊 Resultados", "📜 Histórico", "📈 Estatísticas"])

# Upload Tab
with tab_upload:
    uploaded_file, text_input, doc_name_input = render_file_upload()

    if st.button("Processar", disabled=st.session_state.processing):
        st.session_state.current_time = st.session_state.get('current_time', '') # Store current time for history
        if uploaded_file:
            asyncio.run(process_data('file', uploaded_file))
        elif text_input:
            asyncio.run(process_data('text', text_input, doc_name_input or "texto_direto"))
        else:
            st.warning("Por favor, envie um arquivo ou insira um texto para processar.")

# Results Tab
with tab_results:
    if st.session_state.error:
        st.error(st.session_state.error)
    elif st.session_state.results:
        render_task_list(
            tasks=st.session_state.results.get('tasks', []),
            document_name=st.session_state.results.get('document', {}).get('name', 'N/A')
        )
    else:
        st.info("Ainda não há resultados. Processe um documento na aba 'Upload'.")

# History Tab
with tab_history:
    st.header("Histórico de Processamentos")
    if st.session_state.history:
        for i, entry in enumerate(reversed(st.session_state.history)): # Show most recent first
            expander_title = f"{entry['timestamp']} - {entry['document_name']} ({entry['tasks_count']} tarefas)"
            with st.expander(expander_title):
                st.json(entry['results'])
                # Option to re-display in results tab
                if st.button(f"Ver Detalhes #{len(st.session_state.history) - i}", key=f"history_btn_{i}"):
                    st.session_state.results = entry['results']
                    st.session_state.active_tab = "📊 Resultados" # This won't directly change the tab, but sets state
                    st.experimental_rerun()
    else:
        st.info("Nenhum processamento no histórico ainda.")

# Statistics Tab
with tab_stats:
    if st.session_state.error:
        st.error(st.session_state.error)
    elif st.session_state.results:
        render_statistics(
            tasks=st.session_state.results.get('tasks', []),
            document=st.session_state.results.get('document', {})
        )
    else:
        st.info("Não há dados para exibir estatísticas. Processe um documento primeiro.")

# Update current_time for history
st.session_state.current_time = st.session_state.get('current_time', '') or datetime.now().strftime("%Y-%m-%d %H:%M:%S")