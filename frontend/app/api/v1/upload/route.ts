import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://todwosflbwzuizvedouy.supabase.co";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient(url, key);
}

export async function POST(req: NextRequest) {
  try {
    const admin = getAdminClient();
    if (!admin) {
      return NextResponse.json({ detail: "Storage service key not set on server" }, { status: 503 });
    }

    const formData = await req.formData();
    const image = formData.get("image") as File | null;
    const thumb = formData.get("thumb") as File | null;
    const scanId = (formData.get("scan_id") as string) || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `scan_${Date.now()}`);
    const userId = (formData.get("user_id") as string) || "anonymous";

    if (!image) {
      return NextResponse.json({ detail: "Image file is required" }, { status: 400 });
    }

    const folder = userId.replace(/[^a-zA-Z0-9_-]/g, "_");
    const imgPath = `${folder}/${scanId}.jpg`;
    const thPath = `${folder}/${scanId}_thumb.jpg`;

    const imgBytes = await image.arrayBuffer();
    const uploadTasks: Promise<any>[] = [
      admin.storage.from("scan-images").upload(imgPath, Buffer.from(imgBytes), {
        contentType: image.type || "image/jpeg",
        upsert: true,
      }),
    ];

    if (thumb) {
      const thBytes = await thumb.arrayBuffer();
      uploadTasks.push(
        admin.storage.from("scan-images").upload(thPath, Buffer.from(thBytes), {
          contentType: thumb.type || "image/jpeg",
          upsert: true,
        })
      );
    }

    const results = await Promise.all(uploadTasks);
    const imgErr = results[0]?.error;

    if (imgErr) {
      return NextResponse.json({ detail: imgErr.message }, { status: 500 });
    }

    const { data: imgUrlData } = admin.storage.from("scan-images").getPublicUrl(imgPath);
    const { data: thUrlData } = admin.storage.from("scan-images").getPublicUrl(thumb ? thPath : imgPath);

    return NextResponse.json({
      image_url: imgUrlData.publicUrl,
      thumb_url: thUrlData.publicUrl,
      scan_id: scanId,
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || "Upload failed" }, { status: 500 });
  }
}
