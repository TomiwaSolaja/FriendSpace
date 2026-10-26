import { BlobServiceClient } from "@azure/storage-blob";
import fs from "fs/promises";
import path from "path";

const LOCAL_DIR = path.join(process.cwd(), "data", "photos");

function containerName() {
  return process.env.AZURE_STORAGE_CONTAINER || "photos";
}

function contentTypeFor(blobName: string) {
  if (blobName.endsWith(".png")) return "image/png";
  if (blobName.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

function assertSafeName(blobName: string) {
  if (!blobName || blobName.includes("..") || path.isAbsolute(blobName)) {
    throw new Error("Invalid photo path");
  }
}

export async function savePhoto(userId: string, bytes: Buffer, ext: string) {
  const blobName = `${userId}/${crypto.randomUUID()}.${ext}`;
  const connection = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (connection) {
    const container = BlobServiceClient.fromConnectionString(connection).getContainerClient(containerName());
    await container.createIfNotExists();
    await container.getBlockBlobClient(blobName).uploadData(bytes, {
      blobHTTPHeaders: { blobContentType: contentTypeFor(blobName) },
    });
    return blobName;
  }

  const full = path.join(LOCAL_DIR, blobName);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, bytes);
  return blobName;
}

export async function readPhoto(blobName: string) {
  assertSafeName(blobName);
  const connection = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (connection) {
    const container = BlobServiceClient.fromConnectionString(connection).getContainerClient(containerName());
    const blob = container.getBlockBlobClient(blobName);
    if (!(await blob.exists())) return null;
    const data = await blob.downloadToBuffer();
    return { data, contentType: contentTypeFor(blobName) };
  }

  try {
    const data = await fs.readFile(path.join(LOCAL_DIR, blobName));
    return { data, contentType: contentTypeFor(blobName) };
  } catch {
    return null;
  }
}

export async function deleteStoredPhoto(blobName: string) {
  assertSafeName(blobName);
  const connection = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (connection) {
    const container = BlobServiceClient.fromConnectionString(connection).getContainerClient(containerName());
    await container.getBlockBlobClient(blobName).deleteIfExists();
    return;
  }
  await fs.rm(path.join(LOCAL_DIR, blobName), { force: true });
}
