// app/api/upload/video/route.ts
import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Check environment variables
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    if (!privateKey || !clientEmail || !folderId) {
      console.error("Missing environment variables");
      return NextResponse.json({ 
        error: "Missing Google credentials or folder ID" 
      }, { status: 500 });
    }

    console.log(`Uploading: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
      scopes: ["https://www.googleapis.com/auth/drive.file"],
    });

    const authClient = await auth.getClient();
    const accessToken = (await authClient.getAccessToken()).token;

    if (!accessToken) {
      return NextResponse.json({ error: "Failed to get access token" }, { status: 500 });
    }

    // Step 1: Initiate resumable upload
    const initResponse = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
          "X-Upload-Content-Type": file.type,
          "X-Upload-Content-Length": file.size.toString(),
        },
        body: JSON.stringify({
          name: file.name,
          parents: [folderId],
          mimeType: file.type,
        }),
      }
    );

    if (!initResponse.ok) {
      const errorText = await initResponse.text();
      console.error("Error initiating upload:", errorText);
      return NextResponse.json({ 
        error: `Failed to initiate upload: ${initResponse.statusText}` 
      }, { status: initResponse.status });
    }

    const uploadUrl = initResponse.headers.get("location");
    if (!uploadUrl) {
      return NextResponse.json({ 
        error: "No upload URL returned" 
      }, { status: 500 });
    }

    console.log("Upload session created, uploading file...");

    // Step 2: Upload the file through the backend (this fixes CORS)
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    
    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
        "Content-Length": file.size.toString(),
      },
      body: fileBuffer,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error("Error uploading file:", errorText);
      return NextResponse.json({ 
        error: `Upload failed: ${uploadResponse.statusText}` 
      }, { status: uploadResponse.status });
    }

    const result = await uploadResponse.json();
    console.log("Upload successful:", result.id);

    return NextResponse.json({
      success: true,
      fileId: result.id,
      fileName: result.name,
      mimeType: result.mimeType,
      size: result.size,
      webViewLink: result.webViewLink,
      message: "File uploaded successfully"
    });

  } catch (err: any) {
    console.error("Upload error:", err);
    return NextResponse.json({ 
      error: err.message || "Unexpected server error" 
    }, { status: 500 });
  }
}

// Optional: Keep your existing video-url route for two-step uploads
// But add this endpoint to handle the actual upload proxy