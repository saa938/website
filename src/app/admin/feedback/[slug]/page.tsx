'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function FeedbackDetailsPage() {
  const {slug} = useParams() as { slug: string };
  const router = useRouter();
  const [bug, setBug] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;

    const fetchSingleFeedback = async () => {
      try {
        const docRef = doc(db, 'feedback', slug as string);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setBug(docSnap.data());
        } else {
          console.error("No such document found!");
        }
      } catch (err) {
        console.error("Error pulling document context:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSingleFeedback();
  }, [slug]);

  if (loading) return <div className="p-8 text-center text-gray-500">Loading item snapshot...</div>;
  if (!bug) return <div className="p-8 text-center text-red-500">Feedback ticket not found.</div>;

  return (
    <div className="max-w-2xl mx-auto my-12 p-6 bg-white rounded-lg shadow-md border">
      <button 
        onClick={() => router.back()}
        className="text-sm text-gray-500 hover:text-gray-800 mb-4 inline-flex items-center gap-1"
      >
        ← Back to Dashboard
      </button>

      <div className="flex items-center justify-between border-b pb-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Feedback Record</h1>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${
          bug.type === 'bug' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {bug.type}
        </span>
      </div>


      <div className="space-y-6">
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
            {'Title'}
          </h3>
          <div className="bg-gray-50 border rounded py-2 px-4 text-gray-800 truncate">
            {bug.title}
          </div>
        </div>

        {bug.type === 'bug' && (
          <>
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Issue Category</h3>
              <p className="text-gray-900 font-medium block bg-gray-50 p-2 rounded border ">{bug.bugType}</p>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Context URL</h3>
              {bug.bugUrl && bug.bugUrl !== 'N/A' ? (
                <a 
                  href={bug.bugUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-blue-600 hover:underline break-all font-medium block bg-gray-50 p-2 rounded border"
                >
                  {bug.bugUrl} 
                </a>
              ) : (
                <p className="text-gray-500 bg-gray-50 p-2 rounded border">N/A</p>
              )}
            </div>
          </>
        )}


        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
            {bug.type === 'bug' ? 'Detailed Description & Steps' : 'User Message'}
          </h3>
          <div className="bg-gray-50 border rounded p-4 text-gray-800 whitespace-pre-wrap min-h-[100px]">
            {bug.message}
          </div>
        </div>

        <div className="border-t pt-4 text-xs text-gray-500 space-y-1">
          <p><strong>Contact Email:</strong> {bug.email}</p>
          <p>
            <strong>Timestamp:</strong> {bug.createdAt?.seconds 
              ? new Date(bug.createdAt.seconds * 1000).toLocaleString() 
              : 'N/A'
            }
          </p>
        </div>
      </div>
    </div>
  );
}