import logging
import os
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from typing import Dict, Any, Optional

# Configure basic logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# --- Custom Exceptions ---

class ApiConnectionError(IOError):
    """Custom exception for API connection-related errors."""
    pass

class ApiValidationError(ValueError):
    """Custom exception for API validation errors (e.g., 400 Bad Request)."""
    pass

class ApiServerError(Exception):
    """Custom exception for API server-side errors (5xx)."""
    pass


class ApiClient:
    """
    A client for interacting with the backend REST API.

    This client uses the synchronous `requests` library. The methods are marked `async`
    to align with modern Python practices and for easier future migration to an 
    asynchronous HTTP client like `httpx` if needed.
    """

    def __init__(self, base_url: str, timeout: int = 30, retries: int = 3):
        """
        Initializes the ApiClient.

        Args:
            base_url (str): The base URL of the API (e.g., 'http://localhost:3001/api').
            timeout (int): Default timeout for requests in seconds.
            retries (int): Number of retries for failed requests on specific status codes.
        """
        if not base_url:
            raise ValueError("API base_url cannot be empty.")
            
        self.base_url = base_url.rstrip('/')
        self.timeout = timeout
        
        self.session = requests.Session()
        
        # Configure retry logic for robustness
        retry_strategy = Retry(
            total=retries,
            status_forcelist=[429, 500, 502, 503, 504], # Retry on these server errors
            backoff_factor=1 # Wait 1s, 2s, 4s between retries
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)

    def _handle_response(self, response: requests.Response) -> Dict[str, Any]:
        """
        Handles the HTTP response, parsing JSON and raising custom exceptions on errors.

        Args:
            response (requests.Response): The response object from the `requests` library.

        Returns:
            Dict[str, Any]: The JSON response data as a dictionary.

        Raises:
            ApiValidationError: For 4xx client errors.
            ApiServerError: For 5xx server errors.
            ApiConnectionError: For other network or request-related errors.
        """
        try:
            response.raise_for_status()  # Raises HTTPError for 4xx/5xx responses
            if response.status_code == 204: # No Content
                return {}
            return response.json()
        except requests.exceptions.HTTPError as e:
            status_code = e.response.status_code
            try:
                error_data = e.response.json()
                error_message = error_data.get('error', e.response.text)
            except ValueError:
                error_message = e.response.text

            logger.error(f"HTTP Error {status_code}: {error_message}")
            if 400 <= status_code < 500:
                raise ApiValidationError(f"API Validation Error ({status_code}): {error_message}") from e
            elif 500 <= status_code < 600:
                raise ApiServerError(f"API Server Error ({status_code}): {error_message}") from e
            else:
                raise ApiConnectionError(f"Unexpected HTTP Error ({status_code}): {error_message}") from e
        except requests.exceptions.RequestException as e:
            logger.error(f"API Connection Error: {e}")
            raise ApiConnectionError(f"Failed to connect to the API: {e}") from e

    async def health_check(self) -> Dict[str, Any]:
        """Checks the health of the API."""
        url = f"{self.base_url}/health"
        logger.info(f"Performing health check on {url}...")
        try:
            response = self.session.get(url, timeout=self.timeout)
            return self._handle_response(response)
        except ApiConnectionError as e:
            logger.error("API health check failed.")
            raise e

    async def upload_file(self, file_content: bytes, file_name: str) -> Dict[str, Any]:
        """
        Uploads a file's content to the API for processing.

        Args:
            file_content (bytes): The binary content of the file to upload.
            file_name (str): The name of the file.

        Returns:
            Dict[str, Any]: The processing result from the API.
        """
        url = f"{self.base_url}/upload"
        logger.info(f"Uploading file '{file_name}' to {url}...")
        
        try:
            files = {'file': (file_name, file_content)}
            response = self.session.post(url, files=files, timeout=self.timeout)
            return self._handle_response(response)
        except ApiConnectionError as e:
            logger.error(f"File upload failed for {file_name}.")
            raise e

    async def process_text(self, text: str, document_name: Optional[str] = None) -> Dict[str, Any]:
        """
        Sends a string of text to the API for processing.

        Args:
            text (str): The text content to process.
            document_name (Optional[str]): An optional name for the document.

        Returns:
            Dict[str, Any]: The processing result from the API.
        """
        url = f"{self.base_url}/process-text"
        logger.info(f"Sending text for processing (document: {document_name or 'N/A'})...")
        
        if not text or not text.strip():
            raise ValueError("Text content cannot be empty.")
            
        payload = {"text": text}
        if document_name:
            payload["name"] = document_name
            
        try:
            response = self.session.post(url, json=payload, timeout=self.timeout)
            return self._handle_response(response)
        except ApiConnectionError as e:
            logger.error("Processing text via API failed.")
            raise e
