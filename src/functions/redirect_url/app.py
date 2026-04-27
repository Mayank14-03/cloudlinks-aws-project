import os

import boto3
from botocore.exceptions import ClientError

TABLE_NAME = os.environ["LINKS_TABLE_NAME"]
dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(TABLE_NAME)


def lambda_handler(event, context):
    short_code = (event.get("pathParameters") or {}).get("shortCode", "").strip()
    if not short_code:
        return {"statusCode": 400, "body": "Missing short code"}

    try:
        response = table.get_item(Key={"shortCode": short_code})
    except ClientError:
        return {"statusCode": 500, "body": "Database lookup failed"}

    item = response.get("Item")
    if not item:
        return {"statusCode": 404, "body": "Short URL not found"}

    original_url = item["originalUrl"]

    # Best-effort click counter update.
    try:
        table.update_item(
            Key={"shortCode": short_code},
            UpdateExpression="SET clickCount = if_not_exists(clickCount, :zero) + :inc",
            ExpressionAttributeValues={":inc": 1, ":zero": 0},
        )
    except ClientError:
        pass

    return {
        "statusCode": 301,
        "headers": {"Location": original_url, "Cache-Control": "no-store"},
        "body": "",
    }

