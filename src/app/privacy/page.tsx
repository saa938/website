import fs from "fs";
import path from "path";
import Navbar from "@/components/global/navbar";
import Footer from "@/components/global/footer";

export const metadata = {
  title: "Privacy Policy | FiveHive",
  description: "FiveHive Privacy Policy",
};

export default function PrivacyPage() {
  const htmlPath = path.join(process.cwd(), "public", "privacy-policy-content.html");
  let content: string;
  try {
    content = fs.readFileSync(htmlPath, "utf-8");
  } catch {
    content = "<p class=\"text-muted-foreground\">Privacy policy content not found. Please add <code>public/privacy-policy-content.html</code>.</p>";
  }

  return (
    <>
      <Navbar className="bg-primary-foreground" />

      <main className="min-h-screen bg-background py-16">
        <article className="mx-auto max-w-4xl px-6 lg:px-8 [&_a]:text-primary [&_a]:underline [&_a]:hover:no-underline">
          <div
            className="prose prose-neutral dark:prose-invert max-w-none [&_.body_text]:text-muted-foreground [&_.subtitle]:text-muted-foreground"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </article>
      </main>

      <Footer />
    </>
  );
}
