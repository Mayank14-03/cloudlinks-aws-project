import json
import os
import random
import string
from datetime import datetime, timezone
from urllib.parse import urlparse

import boto3
from botocore.exceptions import ClientError

TABLE_NAME = os.environ["LINKS_TABLE_NAME"]
dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(TABLE_NAME)


def build_response(status_code: int, body: dict) -> dict:
    return {
        "statusCode": status_code,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body),
    }


def is_valid_url(url: str) -> bool:
    try:
        parsed = urlparse(url)
        return parsed.scheme in ("http", "https") and bool(parsed.netloc)
    except Exception:
        return False


def generate_short_code(length: int = 6) -> str:
    chars = string.ascii_letters + string.digits
    return "".join(random.choice(chars) for _ in range(length))


def create_unique_code() -> str:
    for _ in range(8):
        code = generate_short_code()
        response = table.get_item(Key={"shortCode": code}, ProjectionExpression="shortCode")
        if "Item" not in response:
            return code
    raise RuntimeError("Unable to generate unique short code after retries")


def lambda_handler(event, context):
    body_raw = event.get("body") or "{}"
    try:
        body = json.loads(body_raw)
    except json.JSONDecodeError:
        return build_response(400, {"message": "Invalid JSON body"})

    original_url = (body.get("url") or "").strip()
    if not is_valid_url(original_url):
        return build_response(400, {"message": "Please provide a valid http/https URL"})

    short_code = create_unique_code()
    created_at = datetime.now(timezone.utc).isoformat()

    item = {
        "shortCode": short_code,
        "originalUrl": original_url,
        "clickCount": 0,
        "createdAt": created_at,
    }

    try:
        table.put_item(Item=item)
    except ClientError:
        return build_response(500, {"message": "Could not store URL"})

    domain_name = event.get("requestContext", {}).get("domainName", "")
    stage = event.get("requestContext", {}).get("stage", "")
    prefix = f"/{stage}" if stage and stage != "$default" else ""
    short_url = f"https://{domain_name}{prefix}/{short_code}" if domain_name else short_code

    return build_response(
        201,
        {
            "shortCode": short_code,
            "shortUrl": short_url,
            "originalUrl": original_url,
            "createdAt": created_at,
        },
    )

