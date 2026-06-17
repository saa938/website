'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

interface FeedbackDetailsClientProps {
  slug: string;
  config: {
    gitHubAccessToken: string;
    gitHubRepoOwner: string;
    gitHubRepoName: string;
  };
}

function parseMarkdown(text: string): string {
  if (!text) return '';
  
  // 1. Escape HTML to prevent XSS
  let escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  // 2. Inline styling (Bold, Italics, Code, Links)
  escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  escaped = escaped.replace(/__(.*?)__/g, '<strong>$1</strong>');
  escaped = escaped.replace(/\*(.*?)\*/g, '<em>$1</em>');
  escaped = escaped.replace(/_(.*?)_/g, '<em>$1</em>');
  escaped = escaped.replace(/`(.*?)`/g, '<code class="bg-gray-100 text-red-600 px-1.5 py-0.5 rounded font-mono text-xs border">$1</code>');
  escaped = escaped.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-yellow-600 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>');

  // 3. Block elements (headers, lists, paragraphs)
  const lines = escaped.split(/\r?\n/);
  const result: string[] = [];
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) continue;
    const trimmed = line.trim();

    // Check for headers
    const h3Match = line.match(/^### (.*)$/);
    const h2Match = line.match(/^## (.*)$/);
    const h1Match = line.match(/^# (.*)$/);

    if (h3Match) {
      if (inList) { result.push('</ul>'); inList = false; }
      result.push(`<h5 class="text-sm font-bold mt-2 mb-1 text-gray-900">${h3Match[1]}</h5>`);
    } else if (h2Match) {
      if (inList) { result.push('</ul>'); inList = false; }
      result.push(`<h4 class="text-base font-bold mt-3 mb-1 text-gray-900">${h2Match[1]}</h4>`);
    } else if (h1Match) {
      if (inList) { result.push('</ul>'); inList = false; }
      result.push(`<h3 class="text-lg font-bold mt-4 mb-2 text-gray-900">${h1Match[1]}</h3>`);
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const content = trimmed.substring(2);
      if (!inList) {
        result.push('<ul class="list-disc pl-5 my-2 space-y-1 text-gray-800">');
        inList = true;
      }
      result.push(`<li>${content}</li>`);
    } else {
      if (inList) {
        result.push('</ul>');
        inList = false;
      }
      // Empty line or regular line
      if (trimmed === '') {
        result.push('<br />');
      } else {
        result.push(`<div>${line}</div>`);
      }
    }
  }

  if (inList) {
    result.push('</ul>');
  }

  return result.join('');
}

interface FeedbackItem {
  type: string;
  title: string;
  bugType?: string;
  bugUrl?: string;
  message: string;
  email: string;
  attachedImage?: string;
  isResolved?: boolean;
  createdAt?: {
    seconds: number;
    nanoseconds: number;
  };
}

export default function FeedbackDetailsClient({ slug, config }: FeedbackDetailsClientProps) {
  const router = useRouter();
  const [bug, setBug] = useState<FeedbackItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreatingIssue, setIsCreatingIssue] = useState(false);

  useEffect(() => {
    if (!slug) return;

    const fetchSingleFeedback = async () => {
      try {
        const docRef = doc(db, 'feedback', slug);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setBug(docSnap.data() as FeedbackItem);
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

  const handleCreateGitHubIssue = async () => {
    if (!bug) return;
    if (!config.gitHubAccessToken || !config.gitHubRepoOwner || !config.gitHubRepoName) {
      alert("GitHub integration is not fully configured. Please check your server environment variables.");
      return;
    }

    setIsCreatingIssue(true);

    try {
      const owner = config.gitHubRepoOwner;
      const repo = config.gitHubRepoName;
      const url = `https://api.github.com/repos/${owner}/${repo}/issues`;

      const imgSrc = bug.attachedImage 
        ? (bug.attachedImage.startsWith('data:') ? bug.attachedImage : `data:image/png;base64,${bug.attachedImage}`)
        : '';

      const imageSection = imgSrc 
        ? `\n\n### Attached Screenshot\n\n<img src="${imgSrc}" alt="Attached Screenshot" />`
        : '';

      const issueBody = `
### Bug Report Context

- **Category:** ${bug.bugType ?? 'N/A'}
- **Context URL:** ${bug.bugUrl && bug.bugUrl !== 'N/A' ? bug.bugUrl : 'N/A'}
- **Contact Email:** ${bug.email ?? 'anonymous'}

### Detailed Description & Steps to Reproduce

${bug.message}
${imageSection}
`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.gitHubAccessToken}`,
          'Accept': 'application/vnd.github.v3+json',
        },
        body: JSON.stringify({
          title: bug.title || `Bug Report: ${bug.bugType ?? 'General'}`,
          body: issueBody.trim(),
          labels: ['bug'],
        }),
      });

      if (!response.ok) {
        interface GitHubError {
          message?: string;
        }
        const errorData = await response.json().catch(() => ({})) as GitHubError;
        throw new Error(errorData.message ?? `GitHub API responded with status ${response.status}`);
      }

      // Update Firestore document resolution status to resolved
      const docRef = doc(db, 'feedback', slug);
      await updateDoc(docRef, { isResolved: true });

      alert("GitHub Issue created successfully!");
      router.push('/admin/feedback');
      router.refresh();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error("Failed to create GitHub issue:", err);
      alert(`Error creating GitHub issue: ${errorMsg}`);
    } finally {
      setIsCreatingIssue(false);
    }
  };

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
        <div className="flex items-center gap-2">
          {bug.isResolved ? (
            <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase bg-green-100 text-green-800">
              Resolved
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase bg-yellow-100 text-yellow-800">
              Active
            </span>
          )}
          <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${
            bug.type === 'bug' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
          }`}>
            {bug.type}
          </span>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
            Title
          </h3>
          <div className="bg-gray-50 border rounded py-2 px-4 text-gray-800 truncate font-medium">
            {bug.title}
          </div>
        </div>

        {bug.type === 'bug' && (
          <>
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Issue Category</h3>
              <p className="text-gray-900 font-medium block bg-gray-50 p-2 rounded border">{bug.bugType}</p>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Context URL</h3>
              {bug.bugUrl && bug.bugUrl !== 'N/A' ? (
                <a 
                  href={bug.bugUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-yellow-600 hover:underline break-all font-medium block bg-gray-50 p-2 rounded border"
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
          {/* Content Report Container with native Markdown parser applied */}
          <div 
            id="content-report-container"
            className="bg-gray-50 border rounded p-4 text-gray-800 min-h-[100px] leading-relaxed"
            dangerouslySetInnerHTML={{ __html: parseMarkdown(bug.message) }}
          />
        </div>

        {bug.attachedImage && (
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Attached Image</h3>
            <div className="bg-gray-50 border rounded p-4 flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={bug.attachedImage} 
                alt="Attached Screenshot" 
                className="max-h-96 object-contain rounded border shadow-sm"
              />
            </div>
          </div>
        )}

        <div className="border-t pt-4 text-xs text-gray-500 space-y-1">
          <p><strong>Contact Email:</strong> {bug.email}</p>
          <p>
            <strong>Timestamp:</strong> {bug.createdAt?.seconds 
              ? new Date(bug.createdAt.seconds * 1000).toLocaleString() 
              : 'N/A'
            }
          </p>
        </div>

        {bug.type === 'bug' && !bug.isResolved && (
          <div className="pt-4 flex justify-end">
            <button
              onClick={handleCreateGitHubIssue}
              disabled={isCreatingIssue}
              className="px-4 py-2 bg-yellow-600 text-white rounded-md font-semibold text-sm hover:bg-yellow-700 transition duration-200 disabled:bg-gray-400 inline-flex items-center gap-2 shadow-sm"
            >
              {isCreatingIssue ? 'Creating GitHub Issue...' : 'Create GitHub Issue'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
