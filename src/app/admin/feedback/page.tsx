'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { buttonVariants } from "@/components/ui/button";
import {ArrowLeft} from "lucide-react";
import { useRouter } from 'next/navigation';

export default function AdminFeedbackDashboard() {
  const router = useRouter();
  const [feedbackItems, setFeedbackItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        const q = query(collection(db, 'feedback'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const items = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setFeedbackItems(items);
      } catch (error) {
        console.error("Error fetching feedback:", error);
      } finally {
        setLoading(setLoading(false) as any); // safe fallback state handling
        setLoading(false);
      }
    };

    fetchFeedback();
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-500">Loading feedback...</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <Link
        className={buttonVariants({ variant: "outline" })}
        href="/admin"
      >
        <ArrowLeft className="mr-2" />
        Return to Admin Dashboard
      </Link>
      <h1 className="text-3xl font-bold mb-6 mt-6 text-gray-900">Feedback/Bug Reports</h1>
      
      {feedbackItems.length === 0 ? (
        <p className="text-gray-500">No feedback submissions found yet.</p>
      ) : (
        <div className="overflow-x-auto border rounded-lg shadow-sm bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-gray-50 text-gray-700 uppercase font-semibold text-xs tracking-wider">
              <tr>
                <th className="p-4">Type</th>
                <th className="p-4">Title</th>
                <th className="p-4">Submitted By</th>
                <th className="p-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-gray-700">
              {feedbackItems.map((item) => (
                <tr key={item.id} onClick={() => router.push(`/admin/feedback/${item.id}`)} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded text-xs font-semibold uppercase ${
                      item.type === 'bug' ? 'bg-red-100 text-red-800' : 
                      item.type === 'questions' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {item.type}
                    </span>
                  </td>
                  <td className="p-4 font-medium max-w-xs truncate">
                    <Link href={`/admin/feedback/${item.id}`} className="text-yellow-600 hover:underline">
                      {item.type === 'bug' ? `[${item.bugType}] ` : ''}
                      {item.title}
                    </Link>
                  </td>
                  <td className="p-4 text-gray-500">{item.email}</td>
                  <td className="p-4 text-gray-500 whitespace-nowrap">
                    {item.createdAt?.seconds 
                      ? new Date(item.createdAt.seconds * 1000).toLocaleDateString()
                      : new Date().toLocaleDateString()
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}