import os
import boto3
from botocore.config import Config
from dotenv import load_dotenv

load_dotenv()

B2_ENDPOINT = os.getenv("B2_ENDPOINT")
B2_KEY_ID = os.getenv("B2_KEY_ID")
B2_APPLICATION_KEY = os.getenv("B2_APPLICATION_KEY")
B2_BUCKET_NAME = os.getenv("B2_BUCKET_NAME", "qrious-resources-bucket")

# Initialize boto3 S3 client pointed to B2
s3_client = boto3.client(
    "s3",
    endpoint_url=B2_ENDPOINT,
    aws_access_key_id=B2_KEY_ID,
    aws_secret_access_key=B2_APPLICATION_KEY,
    config=Config(signature_version="s3v4"),
)

# Trimmed to what this service actually calls. The API's copy also has
# generate_upload_url/generate_download_url (presigned URLs for the browser) —
# not needed here, this service only reads/writes B2 objects directly.

def download_bytes(key: str) -> bytes:
    """
    Fetch an object's bytes directly from B2, server-side (no presigned URL).
    Used to read an existing lesson PDF for grounding.
    """
    obj = s3_client.get_object(Bucket=B2_BUCKET_NAME, Key=key)
    return obj["Body"].read()

def upload_file(local_path: str, key: str, content_type: str) -> None:
    """
    Upload a local file directly to B2, server-side (no presigned URL).
    Used to publish the finished MP4.
    """
    s3_client.upload_file(local_path, B2_BUCKET_NAME, key, ExtraArgs={"ContentType": content_type})
