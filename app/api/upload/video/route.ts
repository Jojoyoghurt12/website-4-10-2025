// app/api/upload/video/route.ts
import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    console.log("=== VIDEO UPLOAD REQUEST RECEIVED ===");
    
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
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
    console.log(`Target folder ID: ${folderId}`);
    console.log(`Service account: ${clientEmail}`);

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
      scopes: ["https://www.googleapis.com/auth/drive.file"],
    });

    console.log("Google Auth initialized, getting access token...");
    
    const authClient = await auth.getClient();
    const accessToken = (await authClient.getAccessToken()).token;

    if (!accessToken) {
      console.error("Failed to get access token from Google Auth");
      return NextResponse.json({ error: "Failed to get access token" }, { status: 500 });
    }

    console.log("Access token obtained successfully");

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

    console.log(`Resumable upload initiation response: ${initResponse.status} ${initResponse.statusText}`);

    if (!initResponse.ok) {
      const errorText = await initResponse.text();
      console.error("Error initiating resumable upload:", {
        status: initResponse.status,
        statusText: initResponse.statusText,
        errorText,
        headers: Object.fromEntries(initResponse.headers.entries())
      });
      
      let errorMessage = `Failed to initiate upload: ${initResponse.status} ${initResponse.statusText}`;
      
      if (initResponse.status === 401) {
        errorMessage = "Authentication failed - check Google credentials";
      } else if (initResponse.status === 403) {
        errorMessage = "Permission denied - check Google Drive folder permissions";
      } else if (initResponse.status === 404) {
        errorMessage = "Google Drive folder not found - check folder ID";
      }
      
      return NextResponse.json({ 
        error: errorMessage 
      }, { status: initResponse.status });
    }

    const uploadUrl = initResponse.headers.get("location");
    if (!uploadUrl) {
      console.error("No upload URL returned from Google Drive API");
      console.log("Response headers:", Object.fromEntries(initResponse.headers.entries()));
      return NextResponse.json({ 
        error: "No upload URL returned" 
      }, { status: 500 });
    }

    console.log("✓ Resumable upload session created successfully");
    console.log(`Upload URL: ${uploadUrl.substring(0, 100)}...`);

    // Step 2: Upload the file through the backend (this fixes CORS)
    console.log("Converting file to buffer...");
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    console.log(`Buffer created: ${fileBuffer.length} bytes`);
    
    console.log("Uploading file to Google Drive...");
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
      console.error("Error uploading file:", {
        status: uploadResponse.status,
        statusText: uploadResponse.statusText,
        errorText,
        headers: Object.fromEntries(uploadResponse.headers.entries())
      });
      return NextResponse.json({ 
        error: `Upload failed: ${uploadResponse.statusText}` 
      }, { status: uploadResponse.status });
    }

    const result = await uploadResponse.json();
    console.log("✓ Upload successful!");
    console.log("File details:", {
      fileId: result.id,
      fileName: result.name,
      mimeType: result.mimeType,
      size: result.size,
      webViewLink: result.webViewLink
    });
    console.log("=== VIDEO UPLOAD COMPLETED SUCCESSFULLY ===");

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
    console.error("=== UNEXPECTED ERROR IN VIDEO UPLOAD ===");
    console.error("Error details:", {
      message: err.message,
      stack: err.stack,
      name: err.name,
      code: err.code
    });
    
    let errorMessage = "Unexpected server error";
    
    if (err.code === 'ENOTFOUND') {
      errorMessage = "Network error - unable to reach Google Drive API";
    } else if (err.message?.includes('timeout')) {
      errorMessage = "Request timeout - Google Drive API is slow to respond";
    } else if (err.message) {
      errorMessage = `Server error: ${err.message}`;
    }
    
    return NextResponse.json({ 
      error: errorMessage 
    }, { status: 500 });
  }
}