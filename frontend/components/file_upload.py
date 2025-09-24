import streamlit as st

def render_file_upload():
    """
    Renders the file upload and text input components.
    
    Provides a drag & drop file uploader and a text area for direct input.
    Also includes a text input for an optional document name for the text area.

    Returns:
        tuple: A tuple containing the uploaded file object, the text from the 
               text area, and the document name from the text input.
               (uploaded_file, text_input, doc_name_input)
    """
    st.subheader("Opção 1: Enviar um arquivo")
    uploaded_file = st.file_uploader(
        "Escolha um arquivo (.txt, .md)",
        type=['txt', 'md'],
        help="Tamanho máximo: 10MB"
    )

    if uploaded_file:
        # Show a preview
        with st.expander("Visualizar conteúdo do arquivo"):
            try:
                content = uploaded_file.getvalue().decode("utf-8")
                st.text(content[:500] + "..." if len(content) > 500 else content)
            except Exception as e:
                st.warning(f"Não foi possível exibir a pré-visualização: {e}")


    st.subheader("Opção 2: Inserir texto")
    text_input = st.text_area("Cole o conteúdo do seu documento aqui", height=250, key="text_input")
    doc_name_input = st.text_input("Dê um nome para este documento (opcional)", key="doc_name_input")

    return uploaded_file, text_input, doc_name_input
