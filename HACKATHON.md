# Build What Moves India — Hackathon Context

Reference for the coding agent. These are external constraints on the build. Treat them as hard requirements.

Source: https://buildwhatmovesindia.com/brief

---

## Deadline

**August 28, 2026, 8:00 PM IST.** The submission form closes at that time. There is no grace period.

## The challenge

Pick one real problem personally experienced on an Indian public-service website or digital service. Build a simpler, clearer, more useful way to solve it.

Travel, taxes, pensions, certificates, payments, grievances, or any other public need. IRCTC, EPFO, and the Income Tax portal are named as examples, not a fixed list.

## Build requirements

- Must be **built with Codex or powered by an OpenAI model**. Codex must be a meaningful part of how the project was built, not something added for the submission. Expect to explain this on video.
- Must solve one clearly defined user problem.
- Must let a reviewer complete the **main journey start to finish**. A static design is not enough — interface and interactions must work.
- Must be easier to understand or use than the current experience.
- Must be designed for real Indian users: mobile devices, slower connections, limited digital experience.
- Must use **mock or synthetic data** anywhere personal information, payments, OTPs, or government systems would normally be involved.
- Mocked data and dependencies must be clearly identified in the product itself.

A strong build makes these obvious:

- Who is facing the problem
- What is difficult about the current experience
- What changed
- Why this version is better
- What works today, and what is still mocked
- How the idea could work safely at larger scale

## Prohibited

- Accessing, testing, or interfering with any live government system
- Reverse-engineering private systems or using undocumented private APIs
- Scraping personal or restricted information
- Using real Aadhaar numbers, PAN details, passwords, OTPs, payment details, or health information
- Presenting the prototype as an official government product
- Using government logos in a way that suggests approval or partnership
- Submitting an old project with only small changes
- Including code, assets, or data without permission to use

## Submission format

1. **Live public link** that opens in a browser without requesting access. Reviewers will not download a mobile app. Include mock consumer login credentials if login is required.
2. **One video, maximum 2 minutes.** First minute: demo the project as a citizen. Second minute: how it was built and why those choices. Both teammates may present.
3. **Project summary under 250 words** — what it is, why it is better than the current solution.
4. **Partner's registered email** for a team of two. Blank if solo.

Every link must work without requesting access. Verify in a private/incognito window.

## Email and registration rules

- Teams are solo or two people.
- Each teammate registers individually.
- The registered email address is the unique identifier for the entry. Use the **same address at every step**, including the Round 2 resubmission. Entries cannot be moved to another address.
- Both teammates must register and submit **each other's** registered email on the form.

## Judging criteria

| Criterion | Question asked |
|---|---|
| Problem | Is this a real and important user problem? |
| Working build | Does the main journey actually work? |
| Usability | Is the experience simpler, clearer, more accessible? |
| Product thinking | Are the choices thoughtful and well explained? |
| End-to-end thinking | Does it address backend, infrastructure, and process — not just the interface? |
| Honesty | Are limitations, mock data, and dependencies clearly disclosed? |

## Selection timeline

- **Aug 28, 8:00 PM IST** — submissions close
- **Aug 28 – Sep 1** — all submissions reviewed by the organisers with OpenAI; **top 250** shortlisted; every entrant emailed the result
- **Shortlist week** — the 250 get one week of mentorship via a WhatsApp group with five mentors from engineering, tech, and the OpenAI team
- **Sep 7, 2026** — improved build resubmitted in the same format, same email addresses
- **Sep 8–12** — **top 10 finalists** announced; the 250 honoured on a public page
- **Sep 12, 2026** — finalists present live in Bengaluru to founders, creators, mentors, and invited government officials; winners announced same day

Selection does not guarantee any government body will adopt the build.

## Prizes

- **Top 10** — one year of Codex Pro and a Codex Micro
- **Top 3** — a MacBook, in addition
- **Winner** — trip to San Francisco (subject to visa), in addition

## Implications for the build

- Round 1 only needs to clear the top-250 bar. Round 2 on Sep 7 is where depth gets added.
- Deploy the public link early and keep it live; do not leave deployment to the end.
- Target viewport is mobile. Test on a low-end Android and a slow connection.
- Ship a visible "what is real / what is mocked" disclosure in the UI. It is a scored criterion.
- Backend, infrastructure, and process reasoning are scored. Interface polish alone does not satisfy end-to-end thinking.