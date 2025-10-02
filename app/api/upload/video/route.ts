// app/api/upload/video/route.ts
import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    console.log("=== VIDEO UPLOAD REQUEST RECEIVED ===");
    
    const formData = await req.formData();
    const file = formData.get('video') as File; // ✅ FIXED: Changed from 'file' to 'video'
    
    if (!file) {
      console.error("No file provided in request");
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    console.log(`File received: ${file.name}`);
    console.log(`File size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
    console.log(`File type: ${file.type}`);

    // Check environment variables
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    if (!privateKey || !clientEmail || !folderId) {
      console.error("Missing environment variables:", {
        hasPrivateKey: !!privateKey,
        hasClientEmail: !!clientEmail,
        hasFolderId: !!folderId
      });
      return NextResponse.json({ 
        error: "Missing Google credentials or folder ID" 
      }, { status: 500 });
    }

    console.log("Environment variables verified");

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
      scopes: ["https://www.googleapis.com/auth/drive.file"],
    });

    console.log("Getting access token...");
    
    const authClient = await auth.getClient();
    const accessToken = (await authClient.getAccessToken()).token;

    if (!accessToken) {
      console.error("Failed to get access token");
      return NextResponse.json({ error: "Failed to get access token" }, { status: 500 });
    }

    console.log("✓ Access token obtained");

    // Step 1: Initiate resumable upload
    console.log("Initiating resumable upload session...");
    
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

    console.log(`Init response: ${initResponse.status} ${initResponse.statusText}`);

    if (!initResponse.ok) {
      const errorText = await initResponse.text();
      console.error("Error initiating upload:", errorText);
      
      let errorMessage = `Failed to initiate upload: ${initResponse.status}`;
      
      if (initResponse.status === 401) {
        errorMessage = "Authentication failed - check Google credentials";
      } else if (initResponse.status === 403) {
        errorMessage = "Permission denied - check folder permissions";
      } else if (initResponse.status === 404) {
        errorMessage = "Folder not found - check folder ID";
      }
      
      return NextResponse.json({ error: errorMessage }, { status: initResponse.status });
    }

    const uploadUrl = initResponse.headers.get("location");
    if (!uploadUrl) {
      console.error("No upload URL returned");
      return NextResponse.json({ error: "No upload URL returned" }, { status: 500 });
    }

    console.log("✓ Upload session created");

    // Step 2: Upload the file from the SERVER (this avoids CORS!)
    console.log("Uploading file to Google Drive...");
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    
    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
        "Content-Length": file.size.toString(),
      },
      body: fileBuffer,
    });

    console.log(`Upload response: ${uploadResponse.status} ${uploadResponse.statusText}`);

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error("Error uploading file:", errorText);
      return NextResponse.json({ 
        error: `Upload failed: ${uploadResponse.statusText}` 
      }, { status: uploadResponse.status });
    }

    const result = await uploadResponse.json();
    console.log("✓ Upload successful!");
    console.log("File ID:", result.id);
    console.log("=== VIDEO UPLOAD COMPLETED ===");

    return NextResponse.json({
      success: true,
      fileId: result.id,
      fileName: result.name,
      message: "File uploaded successfully"
    });

  } catch (err: any) {
    console.error("=== UPLOAD ERROR ===");
    console.error("Error:", err.message);
    
    return NextResponse.json({ 
      error: err.message || "Unexpected server error" 
    }, { status: 500 });
  }
}