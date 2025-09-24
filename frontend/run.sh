#!/bin/bash

# Instala as dependências
if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt
fi

# Roda a aplicação Streamlit
streamlit run app.py --server.port ${STREAMLIT_SERVER_PORT:-8501}
