import { HandHeart, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <HandHeart size={16} />
          </div>
          <span className="font-semibold text-lg">Bridge</span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="gap-1 pl-0 mb-6"
        >
          <ArrowLeft size={16} />
          Back
        </Button>

        <h1 className="text-2xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-6">Last updated: May 19, 2026</p>

        <Separator className="mb-8" />

        <div className="prose prose-sm max-w-none space-y-6 text-sm leading-relaxed">

          <section className="space-y-2">
            <h2 className="text-base font-semibold">1. Introduction</h2>
            <p>
              Bridge ("we," "us," or "our") is a community platform that connects people who need
              everyday essentials — food, clothing, and household items — with helpers, drivers, and
              organizations willing to donate or deliver them. This Privacy Policy explains how we
              collect, use, and protect your personal information when you use the Bridge app or website.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold">2. Information We Collect</h2>
            <p><strong>Account information:</strong> When you sign in with Google, we receive your name, email address, and profile photo from Google. We store these to identify your account and display your name to other users.</p>
            <p><strong>Profile information:</strong> You may optionally provide a short bio, your vehicle type (drivers), or your organization details. This information is visible to other users of the platform.</p>
            <p><strong>Location data:</strong> If you choose to set your location, we store your latitude and longitude to show you nearby posts and calculate distances. We never share your exact coordinates publicly — only approximate distances are shown.</p>
            <p><strong>Posts and activity:</strong> Content you post (offers, requests, photos) is stored and visible to other users according to the post's purpose.</p>
            <p><strong>Device tokens:</strong> With your permission, we may store Firebase Cloud Messaging tokens to send push notifications about activity relevant to your posts and deliveries.</p>
            <p><strong>Usage data:</strong> Our hosting provider (Google Cloud Run) and Firebase automatically log standard server activity including IP addresses and request timestamps for security and debugging purposes.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold">3. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>To operate the Bridge platform and match helpers with people in need</li>
              <li>To show you relevant posts near your location</li>
              <li>To send push notifications about your posts and deliveries</li>
              <li>To display your public profile (name, bio, rating) to other users</li>
              <li>To investigate reports of policy violations and maintain community safety</li>
              <li>To improve the app and diagnose technical issues</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold">4. Information Sharing</h2>
            <p>We do <strong>not</strong> sell your personal information to third parties.</p>
            <p>We share information only in the following circumstances:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>With other Bridge users:</strong> Your display name, bio, role, and rating are visible to other users. Posts you create are visible to users in your area.</li>
              <li><strong>With service providers:</strong> Google Firebase (authentication, database, hosting) processes data on our behalf under Google's privacy terms.</li>
              <li><strong>For legal compliance:</strong> If required by law or to protect the safety of our users or the public.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold">5. Data Retention</h2>
            <p>
              We retain your account data for as long as your account is active. Posts expire
              automatically (food posts: 3 days, clothing: 30 days, mixed: 7 days) and are marked
              expired rather than deleted to preserve match history.
            </p>
            <p>
              When you delete your account, we permanently delete your profile, location data,
              blocks, and ratings subcollections, and cancel any open posts and pending matches.
              This deletion is irreversible.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold">6. Your Rights</h2>
            <p>You may at any time:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Update your profile information in the app</li>
              <li>Delete your account and all associated data from the Profile → Edit Profile screen</li>
              <li>Revoke Bridge's access to your Google account via your Google Account settings</li>
              <li>Contact us to request a copy of your data or ask questions about our practices</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold">7. Children's Privacy</h2>
            <p>
              Bridge is not directed to children under 13. We do not knowingly collect personal
              information from children under 13. If we learn we have collected such information, we
              will delete it promptly.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold">8. Security</h2>
            <p>
              We use Firebase Authentication (Google Sign-In), HTTPS for all data in transit, and
              Firebase Security Rules to restrict data access. No method of transmission or storage
              is 100% secure; we strive to use commercially acceptable means to protect your data.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold">9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy periodically. We will notify you of significant
              changes by updating the date at the top of this page. Continued use of Bridge after
              changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold">10. Contact Us</h2>
            <p>
              If you have questions or concerns about this Privacy Policy or your data, please
              contact us at: <strong>privacy@bridge.app</strong>
            </p>
          </section>

        </div>

        <Separator className="my-8" />
        <p className="text-xs text-muted-foreground text-center">
          © 2026 Bridge. All rights reserved. ·{" "}
          <a href="/terms" className="underline hover:text-foreground">Terms of Service</a>
        </p>
      </div>
    </div>
  );
}
