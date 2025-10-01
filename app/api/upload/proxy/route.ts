// app/api/upload/proxy/route.ts
// This proxies the upload to Google Drive to avoid CORS issues

import { NextRequest, NextResponse } from "next/server";

export async function PUT(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const uploadUrl = searchParams.get('uploadUrl');
    
    if (!uploadUrl) {
      return NextResponse.json({ error: "No upload URL provided" }, { status: 400 });
    }

    // Validate it's a Google Drive URL
    if (!uploadUrl.startsWith('https://www.googleapis.com/upload/drive/')) {
      return NextResponse.json({ error: "Invalid upload URL" }, { status: 400 });
    }

    // Get the file from the request body
    const arrayBuffer = await req.arrayBuffer();
    const contentType = req.headers.get('content-type') || 'application/octet-stream';

    console.log(`Proxying upload: ${arrayBuffer.byteLength} bytes`);

    // Forward the upload to Google Drive
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        'Content-Length': arrayBuffer.byteLength.toString(),
      },
      body: arrayBuffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Upload proxy error:", errorText);
      return NextResponse.json({ 
        error: `Upload failed: ${response.statusText}`,
        details: errorText
      }, { status: response.status });
    }

    const result = await response.json();
    console.log("Upload proxied successfully:", result.id);

    return NextResponse.json({
      success: true,
      fileId: result.id,
      fileName: result.name,
      mimeType: result.mimeType,
      size: result.size,
      webViewLink: result.webViewLink,
    });

  } catch (err: any) {
    console.error("Proxy error:", err);
    return NextResponse.json({ 
      error: err.message || "Proxy error" 
    }, { status: 500 });
  }
}