"use client";

import { type FormEvent, useEffect, useState } from "react";
import { CommonLoadItem } from "@site/components/animations/CommonLoadAnimation";
import TextScramble from "@site/components/animations/TextScramble";
import { industries } from "@site/content/industries";
import { plans } from "@site/content/pricing";

type Status = "idle" | "sending" | "success" | "error";

/** Demo / enquiry form. Posts to /api/contact, which emails the sales inbox. */
export default function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [feedback, setFeedback] = useState("");
  const [message, setMessage] = useState("");

  // Coming from a pricing card (/contact?plan=pro): start the message with that plan
  useEffect(() => {
    const planId = new URLSearchParams(window.location.search).get("plan");
    const plan = plans.find((p) => p.id === planId);
    if (plan) setMessage(`I'm interested in the ${plan.name} plan (Rs ${plan.price}${plan.period}).

`);
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "sending") return;
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());

    setStatus("sending");
    setFeedback("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatus("success");
        form.reset();
        setMessage("");
        return;
      }
      setStatus("error");
      setFeedback(json.error || "Something went wrong. Please try again in a moment.");
    } catch {
      setStatus("error");
      setFeedback("Request failed. Check your connection and try again.");
    }
  }

  const sending = status === "sending";

  return (
    <div className="mxd-block contact">
      <div className="mxd-form-container">
        {status === "success" ? (
          <p className="t-bold t-large">
            Thank you! <span>We&apos;ve received your message and will get back to you shortly.</span>
          </p>
        ) : (
          <form className="form contact-form" id="contact-form" onSubmit={onSubmit}>
            <div className="container-fluid p-0">
              <div className="row gx-0">
                <CommonLoadItem index={0}>
                  <div className="col-12 col-md-6 mxd-grid-item loading-item">
                    <input type="text" name="name" autoComplete="name" placeholder="Your name*" required disabled={sending} />
                  </div>
                </CommonLoadItem>
                <CommonLoadItem index={1}>
                  <div className="col-12 col-md-6 mxd-grid-item loading-item">
                    <input type="text" name="company" autoComplete="organization" placeholder="Business name" disabled={sending} />
                  </div>
                </CommonLoadItem>
                <CommonLoadItem index={2}>
                  <div className="col-12 col-md-6 mxd-grid-item loading-item">
                    <input type="email" name="email" autoComplete="email" placeholder="Email*" required disabled={sending} />
                  </div>
                </CommonLoadItem>
                <CommonLoadItem index={3}>
                  <div className="col-12 col-md-6 mxd-grid-item loading-item">
                    <input type="tel" name="phone" autoComplete="tel" placeholder="Phone / WhatsApp" disabled={sending} />
                  </div>
                </CommonLoadItem>
                <CommonLoadItem index={4}>
                  <div className="col-12 mxd-grid-item loading-item">
                    <select name="business" defaultValue="" disabled={sending}>
                      <option value="">Business type</option>
                      {industries.map((i) => (
                        <option key={i.slug} value={i.name}>
                          {i.name}
                        </option>
                      ))}
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </CommonLoadItem>
                <CommonLoadItem index={5}>
                  <div className="col-12 mxd-grid-item loading-item">
                    <textarea
                      name="message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Tell us about your business — branches, counters, what you need*"
                      required
                      disabled={sending}
                    />
                  </div>
                </CommonLoadItem>
                <CommonLoadItem index={6}>
                  <div className="col-12 mxd-grid-item loading-item">
                    <button className="btn btn-default-icon btn-default-accent slide-right" type="submit" disabled={sending}>
                      {sending ? (
                        <span className="btn-caption">Sending…</span>
                      ) : (
                        <TextScramble className="btn-caption mxd-scramble">Request a demo</TextScramble>
                      )}
                      <i className="btn-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 18 18" aria-hidden>
                          <path d="M10.8,0v3.6h-3.6V0h3.6ZM14.4,10.8h3.6v-3.6h-3.6v-3.6h-3.6v3.6H0v3.6h10.8v3.6h3.6v-3.6ZM10.8,14.4h-3.6v3.6h3.6v-3.6Z" />
                        </svg>
                      </i>
                    </button>
                  </div>
                </CommonLoadItem>
              </div>
            </div>
            {status === "error" && feedback && (
              <p className="reply__text" role="alert" style={{ marginTop: "2.4rem" }}>
                {feedback}
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
