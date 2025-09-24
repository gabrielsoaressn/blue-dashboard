import streamlit as st
import pandas as pd
import plotly.express as px
from datetime import datetime

@st.cache_data(show_spinner=False)
def render_statistics(tasks: list, document: dict):
    """
    Renders statistics and charts based on the extracted tasks.

    Args:
        tasks (list): A list of task dictionaries.
        document (dict): The document object containing metadata.
    """
    if not tasks:
        st.info("Não há tarefas para exibir estatísticas.")
        return

    df = pd.DataFrame(tasks)

    st.header(f"Estatísticas para: `{document.get('documentName', 'N/A')}`")

    # --- Summary Metrics ---
    total_tasks = len(df)
    high_priority_tasks = len(df[df['priority'] == 'Alta']) if 'priority' in df.columns else 0
    tasks_with_due_date = df['dueDate'].notna().sum() if 'dueDate' in df.columns else 0

    col1, col2, col3 = st.columns(3)
    col1.metric("Total de Tarefas", total_tasks)
    col2.metric("Prioridade Alta", high_priority_tasks)
    col3.metric("Com Data de Vencimento", tasks_with_due_date)

    st.write("---")

    # --- Charts ---
    col_chart1, col_chart2 = st.columns(2)

    # Priority Distribution
    with col_chart1:
        st.subheader("Distribuição por Prioridade")
        if 'priority' in df.columns and not df['priority'].isna().all():
            priority_counts = df['priority'].value_counts()
            fig = px.pie(
                priority_counts, 
                values=priority_counts.values, 
                names=priority_counts.index,
                title="Tarefas por Prioridade",
                color_discrete_sequence=px.colors.sequential.Blues_r
            )
            st.plotly_chart(fig, use_container_width=True)
        else:
            st.warning("Dados de prioridade não disponíveis.")

    # Timeline (Gantt Chart)
    with col_chart2:
        st.subheader("Timeline das Tarefas")
        if 'dueDate' in df.columns and df['dueDate'].notna().any():
            df_timeline = df.dropna(subset=['dueDate', 'title']).copy()
            df_timeline['start'] = datetime.now().date()
            df_timeline['finish'] = pd.to_datetime(df_timeline['dueDate'], errors='coerce')
            df_timeline = df_timeline.dropna(subset=['finish'])

            if not df_timeline.empty:
                fig = px.timeline(
                    df_timeline, 
                    x_start="start", 
                    x_end="finish", 
                    y="title",
                    color="priority",
                    title="Timeline de Vencimento das Tarefas"
                )
                fig.update_yaxes(autorange="reversed")
                st.plotly_chart(fig, use_container_width=True)
            else:
                st.info("Não foi possível gerar a timeline. Verifique o formato das datas de vencimento.")
        else:
            st.info("Nenhuma tarefa com data de vencimento para exibir na timeline.")
