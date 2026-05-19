import { HandHeart, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function TermsOfService() {
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

        <h1 className="text-2xl font-bold mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-6">Last updated: May 19, 2026</p>

        <Separator className="mb-8" />

        <div className="prose prose-sm max-w-none space-y-6 text-sm leading-relaxed">

          <section className="space-y-2">
            <h2 className="text-base font-semibold">1. Acceptance of Terms</h2>
            <p>
              By creating an account or using Bridge ("the Service"), you agree to these Terms of
              Service. If you do not agree, do not use Bridge. We may update these terms; continued
              use after changes constitutes acceptance.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold">2. What Bridge Is</h2>
            <p>
              Bridge is a community platform that facilitates the voluntary donation, exchange, and
              local delivery of everyday items (food, clothing, household goods) between community
              members. Bridge is a technology platform only — we do not own, inspect, or guarantee
              any items posted or exchanged through the Service.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold">3. Eligibility</h2>
            <p>
              You must be at least 13 years old to use Bridge. By using Bridge, you represent that
              you meet this age requirement and that all information you provide is accurate.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold">4. Your Account</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account. You may not
              use someone else's account or impersonate another person. Notify us immediately if you
              suspect unauthorized access to your account.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold">5. Acceptable Use</h2>
            <p>You agree <strong>not</strong> to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Post items that are illegal, dangerous, counterfeit, stolen, or hazardous</li>
              <li>Post food items that are spoiled, contaminated, or unsafe for consumption</li>
              <li>Harass, threaten, or abuse other users</li>
              <li>Post false, misleading, or fraudulent information</li>
              <li>Use Bridge for commercial solicitation or spam</li>
              <li>Attempt to gain unauthorized access to Bridge or its systems</li>
              <li>Use Bridge in any way that violates applicable laws or regulations</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold">6. Content You Post</h2>
            <p>
              You retain ownership of content you post (descriptions, photos). By posting content,
              you grant Bridge a worldwide, non-exclusive, royalty-free license to display and
              distribute that content within the Service for the purpose of operating Bridge.
            </p>
            <p>
              You are solely responsible for the accuracy and legality of content you post. We
              reserve the right to remove any content that violates these Terms or our Community
              Guidelines.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold">7. Transactions Between Users</h2>
            <p>
              Bridge facilitates connections but is not a party to any exchange between users. We
              make no representations about the quality, safety, or legality of items posted. Users
              engage in exchanges at their own risk. Bridge is not liable for any loss, injury, or
              damage arising from user interactions or item exchanges.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold">8. Driver Responsibilities</h2>
            <p>
              Users who register as drivers agree that they hold a valid driver's license (if
              operating a vehicle), are legally permitted to operate their vehicle, carry appropriate
              insurance, and comply with all traffic laws. Bridge does not verify driver credentials
              and is not responsible for delivery-related incidents.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold">9. Ratings and Reviews</h2>
            <p>
              Users may rate each other after completed exchanges. Ratings must be honest and based
              on actual interactions. Attempting to manipulate ratings (e.g., coordinating fake
              positive reviews) is prohibited and may result in account suspension.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold">10. Account Termination</h2>
            <p>
              You may delete your account at any time from the Profile → Edit Profile screen. We
              reserve the right to suspend or terminate accounts that violate these Terms, at our
              sole discretion. Termination does not affect Bridge's rights regarding prior activity.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold">11. Disclaimers</h2>
            <p>
              Bridge is provided "as is" without warranties of any kind, express or implied,
              including fitness for a particular purpose, availability, or accuracy. We do not
              guarantee continuous, uninterrupted access to the Service.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold">12. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, Bridge and its team shall not be liable for
              any indirect, incidental, special, consequential, or punitive damages arising from your
              use of or inability to use the Service, or from any items exchanged through the
              Service.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold">13. Governing Law</h2>
            <p>
              These Terms are governed by the laws of Ontario, Canada, without regard to conflict of
              law principles. Any disputes shall be resolved in the courts of Ontario, Canada.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold">14. Contact</h2>
            <p>
              Questions about these Terms? Contact us at: <strong>legal@bridge.app</strong>
            </p>
          </section>

        </div>

        <Separator className="my-8" />
        <p className="text-xs text-muted-foreground text-center">
          © 2026 Bridge. All rights reserved. ·{" "}
          <a href="/privacy" className="underline hover:text-foreground">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}
