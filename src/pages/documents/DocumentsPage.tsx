import React, { useEffect, useRef, useState } from 'react';
import { FileText, Upload, Download, Trash2, Loader } from 'lucide-react';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const BASE_URL = API_URL.replace('/api', '');
const TOKEN_STORAGE_KEY = 'business_nexus_token';

interface DocumentItem {
  id: number;
  title: string;
  originalName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  status: string;
  createdAt: string;
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileUrl = (filePath: string): string => {
  // filePath comes as "uploads\\documents\\filename.ext" from Windows - normalize slashes
  const normalized = filePath.replace(/\\/g, '/');
  return `${BASE_URL}/${normalized}`;
};

export const DocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getToken = () => localStorage.getItem(TOKEN_STORAGE_KEY);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/documents`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('Failed to load documents');
      const data = await res.json();
      setDocuments(data);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('title', file.name);
      formData.append('file', file);

      const res = await fetch(`${API_URL}/documents/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Upload failed');

      toast.success('Document uploaded successfully!');
      fetchDocuments();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownload = (doc: DocumentItem) => {
    window.open(getFileUrl(doc.filePath), '_blank');
  };

  const handleDelete = async (docId: number) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const res = await fetch(`${API_URL}/documents/${docId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Delete failed');

      toast.success('Document deleted');
      setDocuments(documents.filter((d) => d.id !== docId));
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="text-gray-600">Manage your startup's important files</p>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelected}
          className="hidden"
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
        />
        <Button
          leftIcon={isUploading ? <Loader size={18} className="animate-spin" /> : <Upload size={18} />}
          onClick={handleUploadClick}
          disabled={isUploading}
        >
          {isUploading ? 'Uploading...' : 'Upload Document'}
        </Button>
      </div>

      <Card>
        <CardHeader className="flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900">All Documents</h2>
          <span className="text-sm text-gray-500">{documents.length} file(s)</span>
        </CardHeader>
        <CardBody>
          {isLoading ? (
            <p className="text-center text-gray-500 py-8">Loading documents...</p>
          ) : documents.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No documents uploaded yet.</p>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center p-4 hover:bg-gray-50 rounded-lg transition-colors duration-200"
                >
                  <div className="p-2 bg-primary-50 rounded-lg mr-4">
                    <FileText size={24} className="text-primary-600" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-gray-900 truncate">{doc.title}</h3>
                      <Badge variant={doc.status === 'approved' ? 'secondary' : 'gray'} size="sm">
                        {doc.status}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      <span>{doc.fileType}</span>
                      <span>{formatFileSize(doc.fileSize)}</span>
                      <span>Uploaded {new Date(doc.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-2"
                      aria-label="Download"
                      onClick={() => handleDownload(doc)}
                    >
                      <Download size={18} />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-2 text-error-600 hover:text-error-700"
                      aria-label="Delete"
                      onClick={() => handleDelete(doc.id)}
                    >
                      <Trash2 size={18} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
};