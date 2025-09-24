import streamlit as st
import pandas as pd
import json

def render_task_card(task, index):
    """Renders a single task as an expandable card."""
    with st.expander(f"**{task.get('title', 'Tarefa sem título')}** - Prioridade: {task.get('priority', 'N/A')}"):
        st.markdown(f"**Responsável:** {task.get('assignee', 'Não atribuído')}")
        st.markdown(f"**Descrição:** {task.get('description', 'Sem descrição.')}")
        st.markdown(f"**Data de Vencimento:** {task.get('dueDate', 'Não definida')}")

@st.cache_data(show_spinner=False)
def render_task_list(tasks: list, document_name: str):
    """
    Renders the list of tasks with filtering, sorting, and export options.

    Args:
        tasks (list): A list of task dictionaries.
        document_name (str): The name of the document processed.
    """
    if not tasks:
        st.warning("Nenhuma tarefa foi extraída ou corresponde aos filtros selecionados.")
        return

    # --- Filters & Sorting ---
    st.write("---")
    col1, col2 = st.columns([1, 1])
    
    with col1:
        priorities = sorted(list(set(task.get('priority', 'Normal') for task in tasks)))
        selected_priorities = st.multiselect("Filtrar por Prioridade:", options=priorities, default=priorities)
    
    with col2:
        sort_options = {'Título': 'title', 'Prioridade': 'priority', 'Data de Vencimento': 'dueDate'}
        sort_by = st.selectbox("Ordenar por:", options=list(sort_options.keys()))

    # Apply filtering and sorting
    filtered_tasks = [
        task for task in tasks if task.get('priority', 'Normal') in selected_priorities
    ]
    
    if sort_by and sort_options[sort_by]:
        filtered_tasks.sort(key=lambda x: str(x.get(sort_options[sort_by], '')))

    st.write("---")

    # --- Data Export ---
    col1_exp, col2_exp = st.columns(2)
    
    json_data = json.dumps({"documentName": document_name, "tasks": filtered_tasks}, indent=2)
    col1_exp.download_button(
        label="📥 Exportar para JSON",
        data=json_data,
        file_name=f"tasks_{document_name.replace('.', '_')}.json",
        mime="application/json",
    )

    try:
        df = pd.DataFrame(filtered_tasks)
        csv_data = df.to_csv(index=False).encode('utf-8')
        col2_exp.download_button(
            label="📄 Exportar para CSV",
            data=csv_data,
            file_name=f"tasks_{document_name.replace('.', '_')}.csv",
            mime="text/csv",
        )
    except Exception as e:
        st.error(f"Erro ao gerar CSV: {e}")


    st.write("---")
    st.subheader(f"{len(filtered_tasks)} Tarefas Encontradas")

    # --- Task Display ---
    for i, task in enumerate(filtered_tasks):
        render_task_card(task, i)
