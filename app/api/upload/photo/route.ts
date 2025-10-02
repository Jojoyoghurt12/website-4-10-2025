import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { Readable } from "stream";

export async function POST(req: NextRequest) {
  try {
    console.log("=== PHOTO UPLOAD REQUEST RECEIVED ===");
    
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      console.error("No imageBase64 provided");
      return NextResponse.json({ error: "No imageBase64 provided" }, { status: 400 });
    }

    console.log("Image data received, size:", imageBase64.length);

    // Remove data URL prefix if present
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    // Setup Google Drive auth
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    
    if (!privateKey || !process.env.GOOGLE_CLIENT_EMAIL) {
      return NextResponse.json({ error: "Missing Google credentials" }, { status: 500 });
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: privateKey,
      },
      scopes: ["https://www.googleapis.com/auth/drive.file"],
    });

    const drive = google.drive({ version: "v3", auth });

    // Upload buffer as a stream
    const uploadResponse = await drive.files.create({
      requestBody: {
        name: `photo-${Date.now()}.png`,
        parents: [process.env.GOOGLE_DRIVE_FOLDER_ID!],
        mimeType: "image/png",
      },
      media: {
        mimeType: "image/png",
        body: Readable.from(buffer),
      },
    });

    return NextResponse.json({ fileId: uploadResponse.data.id }, { status: 200 });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error.message || "Unexpected server error" },
      { status: 500 }
    );
  }
}