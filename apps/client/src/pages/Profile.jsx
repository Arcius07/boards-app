import { useEffect, useState, useRef } from "react";
import { Camera, Loader2, Check } from "lucide-react";
import api from "../api/client";
import useAuthStore from "../store/authStore";
import "../style/Profile.css";

function Profile() {
  const [user, setUser] = useState(null);
  const [name, setName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    try {
      const res = await api.get("/auth/me");
      setUser(res.data.user);
      setName(res.data.user.name);
    } catch (err) {
      setError("Failed to load profile");
    }
  }

  async function handleAvatarClick() {
    fileInputRef.current?.click();
  }

  async function handleFileSelected(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5MB");
      return;
    }

    setError("");
    setUploading(true);
    setUploadProgress(0);

    try {
      const signRes = await api.post("/uploads/sign", { type: "avatar" });
      const { signature, timestamp, cloudName, apiKey, folder } = signRes.data;

      const formData = new FormData();
      formData.append("file", file);
      formData.append("signature", signature);
      formData.append("timestamp", timestamp);
      formData.append("api_key", apiKey);
      formData.append("folder", folder);

      const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
      const cloudinaryData = await uploadWithProgress(uploadUrl, formData, setUploadProgress);

      const res = await api.patch("/users/me", { avatarUrl: cloudinaryData.secure_url });
      setUser(res.data.user);
    } catch (err) {
      setError("Failed to upload image");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }

  function uploadWithProgress(url, formData, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", url);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject(new Error("Upload failed"));
        }
      };

      xhr.onerror = () => reject(new Error("Upload failed"));
      xhr.send(formData);
    });
  }

  async function handleSaveName(e) {
    e.preventDefault();
    if (!name.trim() || name === user.name) return;

    setSaving(true);
    setSaved(false);
    try {
      const res = await api.patch("/users/me", { name: name.trim() });
      setUser(res.data.user);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError("Failed to save changes");
    } finally {
      setSaving(false);
    }
  }

  if (!user) {
    return <div className="profile-loading">Loading profile...</div>;
  }

  return (
    <div className="profile-page">
      <div className="profile-card">
        <div className="profile-avatar-section">
          <div className="profile-avatar-glow" />
          <button
            className="profile-avatar-wrapper group"
            onClick={handleAvatarClick}
            disabled={uploading}
          >
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name} className="profile-avatar-img" />
            ) : (
              <div className="profile-avatar-fallback">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="profile-avatar-overlay">
              {uploading ? (
                <Loader2 size={22} className="profile-avatar-spinner" />
              ) : (
                <Camera size={22} />
              )}
            </div>
          </button>

          {uploading && (
            <div className="profile-progress-track">
              <div
                className="profile-progress-fill"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="profile-file-input"
            onChange={handleFileSelected}
          />
        </div>

        <form onSubmit={handleSaveName} className="profile-form">
          <div className="profile-field">
            <label className="profile-label">Full name</label>
            <input
              type="text"
              className="profile-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="profile-field">
            <label className="profile-label">Email</label>
            <input
              type="text"
              className="profile-input profile-input-readonly"
              value={user.email}
              disabled
            />
          </div>

          {error && <div className="profile-error">{error}</div>}

          <button type="submit" className="profile-save-btn" disabled={saving}>
            {saving ? (
              <Loader2 size={16} className="profile-avatar-spinner" />
            ) : saved ? (
              <>
                <Check size={16} /> Saved
              </>
            ) : (
              "Save changes"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Profile;