import json
import os
from decimal import Decimal

import boto3
from botocore.exceptions import ClientError

TABLE_NAME = os.environ["LINKS_TABLE_NAME"]
dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(TABLE_NAME)


def to_int(value):
    if isinstance(value, Decimal):
        return int(value)
    if isinstance(value, int):
        return value
    if value is None:
        return 0
    return int(value)


def lambda_handler(event, context):
    try:
        response = table.scan(
            ProjectionExpression="shortCode, originalUrl, clickCount, createdAt"
        )
    except ClientError:
        return {
            "statusCode": 500,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"message": "Could not read analytics data"}),
        }

    items = response.get("Items", [])
    normalized = []
    total_clicks = 0

    for item in items:
        click_count = to_int(item.get("clickCount", 0))
        total_clicks += click_count
        normalized.append(
            {
                "shortCode": item.get("shortCode", ""),
                "originalUrl": item.get("originalUrl", ""),
                "clickCount": click_count,
                "createdAt": item.get("createdAt", ""),
            }
        )

    top_links = sorted(normalized, key=lambda x: x["clickCount"], reverse=True)[:10]

    body = {
        "summary": {
            "totalLinks": len(normalized),
            "totalClicks": total_clicks,
        },
        "topLinks": top_links,
    }

    return {
        "statusCode": 200,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body),
    }

