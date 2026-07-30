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

def generate_upload_url(key: str, content_type: str, expires_in: int = 3600) -> str:
    """
    Generate a presigned URL for the client to PUT a file directly into B2.
    """
    return s3_client.generate_presigned_url(
        "put_object",
        Params={"Bucket": B2_BUCKET_NAME, "Key": key, "ContentType": content_type},
        ExpiresIn=expires_in,
    )

def generate_download_url(key: str, expires_in: int = 3600) -> str:
    """
    Generate a presigned URL for the client to GET a file directly from B2.
    """
    return s3_client.generate_presigned_url(
        "get_object",
        Params={"Bucket": B2_BUCKET_NAME, "Key": key},
        ExpiresIn=expires_in,
    )

def download_bytes(key: str) -> bytes:
    """
    Fetch an object's bytes directly from B2, server-side (no presigned URL).
    Used by the video-overview render service to read an existing lesson PDF for grounding.
    """
    obj = s3_client.get_object(Bucket=B2_BUCKET_NAME, Key=key)
    return obj["Body"].read()

def upload_file(local_path: str, key: str, content_type: str) -> None:
    """
    Upload a local file directly to B2, server-side (no presigned URL).
    Used by the video-overview render service to publish the finished MP4.
    """
    s3_client.upload_file(local_path, B2_BUCKET_NAME, key, ExtraArgs={"ContentType": content_type})


def delete_object(key: str) -> None:
    """
    Deletes an object from the primary B2 bucket. Used by qStudio to remove an
    uploaded PDF source when the source or its study space is deleted — qStudio
    sources live in this same primary bucket (not the qBook-datasets bucket),
    since they're only ever read server-side, unlike qBook datasets which the
    browser relays into a third-party-adjacent kernel container.
    """
    s3_client.delete_object(Bucket=B2_BUCKET_NAME, Key=key)


# --- qBook datasets: separate bucket, separate credentials ---
# Kept on its own B2 Application Key (not B2_KEY_ID/B2_APPLICATION_KEY above) so a
# leaked/compromised dataset-upload credential can't reach course videos/PDFs and
# vice versa — same least-privilege reasoning iqm_service/video_service each got
# their own isolated credentials for. See PLANS/qbook-qml.md §6.1.
B2_DATASETS_KEY_ID = os.getenv("B2_DATASETS_KEY_ID")
B2_DATASETS_APPLICATION_KEY = os.getenv("B2_DATASETS_APPLICATION_KEY")
B2_DATASETS_BUCKET_NAME = os.getenv("B2_DATASETS_BUCKET_NAME")

datasets_s3_client = boto3.client(
    "s3",
    endpoint_url=B2_ENDPOINT,  # same B2 account/region as the resources bucket
    aws_access_key_id=B2_DATASETS_KEY_ID,
    aws_secret_access_key=B2_DATASETS_APPLICATION_KEY,
    config=Config(signature_version="s3v4"),
)

def generate_dataset_upload_url(key: str, content_type: str, expires_in: int = 3600) -> str:
    """Presigned URL for the client to PUT a CSV directly into the datasets bucket."""
    return datasets_s3_client.generate_presigned_url(
        "put_object",
        Params={"Bucket": B2_DATASETS_BUCKET_NAME, "Key": key, "ContentType": content_type},
        ExpiresIn=expires_in,
    )

def generate_dataset_download_url(key: str, expires_in: int = 3600) -> str:
    """Presigned URL for the client to GET a CSV directly from the datasets bucket —
    the browser fetches this itself and relays the bytes over qBook's kernel
    WebSocket (notebook_service never holds a B2 credential; see qbook-qml.md §0).
    """
    return datasets_s3_client.generate_presigned_url(
        "get_object",
        Params={"Bucket": B2_DATASETS_BUCKET_NAME, "Key": key},
        ExpiresIn=expires_in,
    )

def delete_dataset_object(key: str) -> None:
    """Deletes a dataset's underlying object from B2 when its Mongo doc is deleted."""
    datasets_s3_client.delete_object(Bucket=B2_DATASETS_BUCKET_NAME, Key=key)
