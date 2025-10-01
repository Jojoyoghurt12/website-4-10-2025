// Updated page.tsx with chunked photo uploads

"use client"

import React, { useRef, useState } from "react";
import { Upload } from 'lucide-react';

export default function Page() {
  const videoRef = useRef<HTMLVideoElement>(null); 
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraStarted, setCameraStarted] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [photo, setPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({});
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);

  const startCamera = async (mode: "user" | "environment" = "user") => {
    setError(null);
    setPhoto(null);
    setUploadResult(null);

    if (cameraStarted) {
      stopCamera();
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { exact: mode } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraStarted(true);
        setFacingMode(mode);
      }
    } catch (err: any) {
      setError(err.message || "Unable to access camera.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      (videoRef.current.srcObject as MediaStream)
        .getTracks()
        .forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraStarted(false);
  };

  // FIXED: Use server-side photo upload (no chunking, no CORS)
  const uploadPhoto = async (imageData: string) => {
    setUploading(true);
    setUploadResult(null);
    setError(null);

    try {
      console.log("Uploading photo to /api/upload/photo");
      
      const response = await fetch('/api/upload/photo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageBase64: imageData })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const result = await response.json();
      setUploadResult(`Photo uploaded successfully!`);
      console.log('Photo uploaded:', result.fileId);
    } catch (err: any) {
      console.error("Photo upload error:", err);
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  // FIXED: Call uploadPhoto instead of uploadPhotoChunked
  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Flip the canvas horizontally for front camera
    if (facingMode === "user") {
      ctx.scale(-1, 1);
      ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    } else {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }

    const dataURL = canvas.toDataURL("image/png");
    setPhoto(dataURL);
    stopCamera();
    uploadPhoto(dataURL); // FIXED: Use server-side upload
  };

  const compressImage = (file: File, maxWidth: number = 1920, quality: number = 0.8): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to compress image'));
          }
        }, 'image/jpeg', quality);
      };
      
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  const toggleCamera = () => {
    startCamera(facingMode === "user" ? "environment" : "user");
  };

  // FIXED: Use server-side upload for file inputs too
  const handleUnifiedUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    console.log(`Starting upload of ${files.length} files`);
    setError(null);

    for (const file of Array.from(files)) {
      const fileId = `${file.name}-${Date.now()}`;
      
      try {
        setUploadingFiles(prev => [...prev, fileId]);
        setUploadProgress(prev => ({ ...prev, [fileId]: 10 }));

        if (file.type.startsWith("image/")) {
          // Handle image upload
          console.log(`Processing image: ${file.name}`);
          setUploadProgress(prev => ({ ...prev, [fileId]: 30 }));
          
          // Compress the image first
          const compressedBlob = await compressImage(file);
          const compressedFile = new File([compressedBlob], file.name, { type: 'image/jpeg' });
          
          setUploadProgress(prev => ({ ...prev, [fileId]: 50 }));
          
          // Convert to base64
          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(compressedFile);
          });
          
          const imageBase64 = await base64Promise;
          
          setUploadProgress(prev => ({ ...prev, [fileId]: 70 }));
          
          // Upload via API
          const response = await fetch('/api/upload/photo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64 })
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Upload failed');
          }

          setUploadProgress(prev => ({ ...prev, [fileId]: 100 }));
          console.log(`Successfully uploaded image: ${file.name}`);

        } else if (file.type.startsWith("video/")) {
          // Handle video upload
          console.log(`Processing video: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
          
          const maxSize = 500 * 1024 * 1024;
          if (file.size > maxSize) {
            throw new Error('Video file must be less than 500MB');
          }

          setUploadProgress(prev => ({ ...prev, [fileId]: 30 }));

          const formData = new FormData();
          formData.append('video', file);
          
          const response = await fetch('/api/upload/video', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Video upload failed');
          }

          setUploadProgress(prev => ({ ...prev, [fileId]: 100 }));
          console.log(`Successfully uploaded video: ${file.name}`);
        }

      } catch (error: any) {
        console.error(`Error uploading ${file.name}:`, error);
        setError(`Failed to upload ${file.name}: ${error.message}`);
        setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));
      } finally {
        setUploadingFiles(prev => prev.filter(id => id !== fileId));
      }
    }

    console.log('All uploads completed');
  };

  return (
    <div className="relative min-h-[100vh]p-6 w-[360px] mx-auto">
      <h1 className="garamond-title box-text text-2xl text-center mb-20 mt-14 ">
        Mirova 50tka
      </h1>
      
      
      
      {/* Camera Controls */}
      <div className="flex flex-wrap gap-3 justify-center mb-4">
        <button
          onClick={toggleCamera}
          disabled={!cameraStarted}
          className={`${ 
            cameraStarted ? "garamond box px-4 py-2 rounded-lg hover:bg-white disabled:bg-gray-200" : ""}`}
        >
          {cameraStarted ? facingMode === "user" ? "Zadná" : "Predná"  : " "}
          {cameraStarted ? " Kamera" : " "}
        </button>

        {photo && (
          <div className="flex gap-4 justify-center mt-2">
            <button
              onClick={() => {
                if (!photo) return;
                const link = document.createElement("a");
                link.href = photo;
                link.download = "photo.png";
                link.click();
              }}
              className="garamond box px-4 py-2 text-white rounded-lg hover:bg-white disabled:bg-gray-300 mr-[7px]"
            >
              Stiahni fotku
            </button>
          </div>
        )}
        
        <div className="flex gap-4 justify-center mt-2">
          <a
            className={`${
              uploading ? "garamond box-loading px-4 py-2 bg-gray-400 text-white rounded-lg " : " "
            }`}
          >
            {uploading ? "Nahráva sa fotka..." : " "}
          </a>               
        </div>

        {error && <p className="text-red-500 text-center mb-2">Error: {error}</p>}

        {/* Camera View */}
        {photo ? (
          <div className="text-center">
            <img
              src={photo}
              alt="Captured"
              className="photo rounded-lg shadow-md border mr-[7px]"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className={`photo rounded-lg bg-black mx-auto ${
                facingMode === "user" ? "scale-x-[-1]" : ""
              }`}
            />

            {cameraStarted && (
              <button
                onClick={takePhoto}
                disabled={!cameraStarted}
                className="camera mt-4 rounded-lg hover:bg-black/60 disabled:bg-gray-200"
              />
            )}
          </div>
        )}

        <button
          onClick={() => startCamera(facingMode)}
          disabled={cameraStarted || uploadingFiles.length > 0}
          className={`${
            cameraStarted ? " " : "garamond box px-4 py-2 rounded-lg"
          } hover:bg-white disabled:bg-gray-400`}
        >
          {cameraStarted ? " " : "Zapni kameru"}
        </button>

        <a
          href="https://drive.google.com/drive/folders/1Feu4T54SDYag8V9n8FPPAfwyHtQpShkL?usp=share_link"
          target="_blank"
          rel="noopener noreferrer"
          className={`${
            cameraStarted ? " " : "garamond box px-4 py-2 text-white rounded-lg hover:bg-white"}`}
        > 
          {cameraStarted ? " ": "Otvor Album"}
        </a>
      </div>

      {/* Upload Progress */}
      {uploadingFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          <h3 className="text-sm font-medium text-center">Nahrávanie súborov...</h3>
          {uploadingFiles.map((fileId) => (
            <div key={fileId} className="bg-white-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress[fileId] || 0}%` }}
              />
              <div className="text-xs text-center mt-1">
                {fileId.split('-')[0]} - {Math.round(uploadProgress[fileId] || 0)}%
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Unified File Upload */}
      <div className="mt-6 border-t blue-color pt-4">
        <div className="border-2 border-dashed blue-color rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
          <Upload className="mx-auto mb-4" size={32} />
          <label className="cursor-pointer blue-color">
            <span className="garamond box-text px-4 py-2 text-base font-medium text-gray-700 hover:text-gray-900">
              Nahraj fotky a videá
            </span>
            <input
              type="file"
              accept="image/*, video/*"
              multiple
              onChange={handleUnifiedUpload}
              className="hidden"
              disabled={uploadingFiles.length > 0}
            />
          </label>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}