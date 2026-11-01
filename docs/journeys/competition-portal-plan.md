# Competition portal plan (draft for review)

Status: **draft**. Nothing in this document is built yet. Review the decisions in [section 8](#8-decisions-to-mark-before-build) and mark each one before implementation starts.

Source: *Abacus & Hobby Competition Portal — User Journeys (Admin & Student)*, plus the follow-up that some academies and children are **not** part of an existing franchise brand.

Related today: [competitions.md](../spec/competitions.md), OpenSpec [`brand-competitions-module`](../../openspec/specs/brand-competitions-module/spec.md).

---

## Contents

1. [Who uses it](#1-who-uses-it)
2. [People who are not on a franchise brand](#2-people-who-are-not-on-a-franchise-brand)
3. [What EduNudg already has](#3-what-edunudg-already-has)
4. [Rules to lock](#4-rules-to-lock)
5. [Phases](#5-phases)
6. [Screens and data by phase](#6-screens-and-data-by-phase)
7. [Out of scope](#7-out-of-scope)
8. [Decisions to mark before build](#8-decisions-to-mark-before-build)

---

## 1. Who uses it

| Person | Where they sign in | What they can do |
|---|---|---|
| Platform admin | Platform `/admin` | Create a host brand. Turn **Competitions** on. Leave franchise features off. |
| Host admin | That brand’s `/app` | Question bank, blueprint, lock the paper, vouchers, mission control, audit, certificates. |
| Franchise brand admin | Their own brand `/app` | The same tools for **their own** students. They cannot edit another host’s paper. |
| Franchise center staff | Their center `/app` | Upload their own roster into a host event they were invited to. They do not see outside children. |
| Parent | Host learn / parents portal | Google or email sign-in, create the child, pay for practice, open results. |
| Child | Same portal, or a voucher code for one live exam | Practice tests and the live paper. |

A voucher code opens **one locked exam**. It does not sign the child into another brand.

---

## 2. People who are not on a franchise brand

Every question bank, payment, and student still has a `brand_id`. There is no account that belongs to no brand.

### Outside academy

Platform admin creates a brand named for that academy and enables **only** Competitions.

Left off:

- Curriculum
- Franchises
- Merchandise
- The franchise Students directory

They receive an admin login and a subdomain. Their questions never appear inside Vihaan Abacus or any other franchise brand.

If a later table still requires a center row, the host gets one hidden **Direct** center. Staff do not create a fake franchise, course, or level before they can publish an exam.

### Outside child

The parent registers on **that host**, not on a franchise learn site.

Saved on the child:

- Name
- Date of birth
- City or branch label (typed, for example “Pune”)
- Parent email
- Parent phone (contact only, not a password)

The age band is calculated from the date of birth and stored. The enrollment is **competition-only**.

The child can practice, pay, and sit the exam. They do **not** show on a franchise Students list as Unassigned or Pending. No center is asked to assign them a program.

### Franchise that also joins a national event

The **host brand** owns the paper, the fee, the audit, and the leaderboard.

The franchise either:

- uploads a roster into that event, or
- each parent registers the child on the host.

“Pune Branch” on the certificate is the branch name they entered, or the franchise they came from. The host brand does not become the owner of that franchise.

---

## 3. What EduNudg already has

Brand Competitions already lives at `/app/competitions`. The **platform** turns it on or off for that brand from the brand Features card. It stays **off** until platform admin enables `competitions`. The brand cannot switch the module on by itself. When it is off, the Competitions nav is hidden, `/app/competitions` returns to `/app`, and students do not see Events.

The brand takes the exam from **Competitions** (`/app/competitions`): question bank, create the paper, publish, and release the result. There is no second exam page. Platform admin can also open that same screen through Brand backend and edit the paper. Platform control is the on/off switch. Brand control is everything inside the module while the switch is on.

| Already built | Not built |
|---|---|
| Events with a free or paid fee. Paid student registration is still “coming soon”. Free events can be self-enrolled. | Difficulty, marks, age band, formula category. |
| Multiple-choice bank tagged to a **course** and **level**. 2–6 options, at least one correct. | CSV import that creates question **rows**. Today CSV/Excel/PDF is a file the student downloads. |
| Questions copied onto the event and locked after the first student attempt (`QUESTIONS_LOCKED`). | Blueprint (40% easy / 30% medium / 30% hard) and Publish & Lock of one shared order. |
| Learn portal: enroll, one quiz, score saved. Correct answers hidden until submit. | Speech, junior numpad, two free practice attempts, Razorpay for a paper. |
| Papers in private storage. Students see them only after enroll. | Voucher codes, waiting room, server-clock start, offline save, tab-switch log, audit queue, public leaderboard, PDF certificates. |

Student sign-in today is the learn-portal **email and password**. It is not Google-only, and it is not an activation code.

---

## 4. Rules to lock

These rules settle the contradictions in the journey document.

1. **One age band** on the exam drives the paper, the on-screen controls, and the leaderboard group. A child who is age 6 cannot sit a paper built for ages 8–11 and then appear on an ages 5–7 board.
2. **Practice and live are different modes.** The result is the score (marks, right count, time). The system calculates it at submit from the options the child picked. Staff do not type each child’s result. A practice or free paper shows that result immediately. A live paper stores it immediately and shows it only after an admin releases the board. The correct choices are a separate review screen, not the result.
3. **Two free practice attempts** are counted **per child**, not per parent Google account.
4. **Question order is frozen at publish.** Every candidate gets the same questions in the same order. The official answer stays editable until the leaderboard is released. See [Clock and live answer edits](#clock-and-live-answer-edits).
5. **Two clocks, both from the server.** A countdown until the start, then a countdown of the time remaining once the exam opens. The browser clock cannot open question 1 early or add extra minutes.
6. **Early download** of the paper into the browser exists so a short network drop does not stop the exam. The server still refuses answers before the start time.
7. **Tab-away and fullscreen exit** are warnings stored for audit. They do not disqualify the child by themselves. Disqualification is an admin decision.
8. **Finishers cannot open review** until release. That stops early finishers from sharing answers.
9. **Rank** uses score, then time, down to the millisecond. Equal score and equal time stay tied.
10. **Three prices are three products.** Practice unlock, parent seat fee, and academy bulk voucher each have their own amount in INR and their own refund rule.
11. **Phone is not the login.** Live entry is the voucher code, or the child’s existing learn login plus password. Parent phone stays a contact field.
12. **This release is multiple choice only.** Every question has radio choices, as in the reference screenshots. A box where the child types the answer is not part of this plan.

### Clock and live answer edits

Confirmed from review:

| Moment | What the child sees | What the admin can change |
|---|---|---|
| Before start | Lobby countdown to the start time (sample: “Tournament begins in 07m 14s”). | Official answers. |
| Exam opens | The same start for everyone. A **time-remaining clock** counts down the duration (sample: 10:00 → 00:00). | Official answers, while the exam is running. |
| Clock hits 00:00 | The paper closes and the attempt is submitted. | Official answers, until release. |
| Leaderboard released | Rank, review, certificate. | Nothing on this paper. The answer key is frozen so ranks do not move. |

The clock is the server start time plus the duration. A laptop clock that is five minutes fast does not finish early and does not grant extra time.

**Live answer edit.** After Publish, the admin can correct the official answer on a question. They cannot add, remove, or reorder questions, and they cannot change a multiple-choice question into a typed question (or the reverse) after a child has started.

**Where the answer is stored.** Staff save the correct radio option on the question when they build or import the paper. That is the official answer. The child’s selected option is stored only when they save that question or submit the paper. The server compares the two. Staff do not type a fresh answer key after each child submits.

**Result versus answer.** The result is the score. The answer is which radio option was correct. Staff store the correct option on the question. They do not store the child’s result. The server writes the result when the child presses **Submit Test**.

| Paper | Result after Submit Test | Correct choices after Submit Test |
|---|---|---|
| Practice or free test | Shown immediately: marks, how many right, time taken. | Shown on the review that opens with that result. |
| Live tournament | Saved immediately, hidden from the child. Shown when the admin releases the board, because an audit or a corrected key can change the marks. | Hidden until the same release, so a child who finishes early cannot pass the key to someone still in the exam. |

Scores are recalculated for every attempt when the admin saves a new official answer, and again at release. A child who already finished is included. The option the child selected does not change.

**Typed answers are out of this release.** Every question on the paper has choices. The child selects one radio option. They do not type the answer.

### Reference exam screen

The free-test list at [Abacus - Free Test](https://adalearning.adaminischool.com/abacus---free-test) is the catalog: levels A1–A4 and B1–B3, each with several papers. The sitting itself is the three-step runner in the review screenshots (Classplus-style). That runner is the layout we will follow. The earlier one-question numpad sketch is not the target.

**Step 1. Instructions.** Title of the paper (example: Abacus Free Test A1-1). General instructions. Child name. **Next**.

**Step 2. Paper summary.** Question count, duration, and total marks (example: 100 questions, 6 minutes, 200 marks). Section name. A checkbox: the child has read the instructions. **Attempt Test** stays off until the box is checked.

**Step 3. Question.** This is the screen that must match.

| Area | What it shows |
|---|---|
| Top left | Paper name and section |
| Top right | **Time left** for the whole paper (example `00 : 05 : 26`) and the child name |
| Question head | Question number, marks for this question (example +2), a small timer on this question, **Mark for review**, **Save** |
| Left | The sum written as a vertical list, one number per line, including negatives (`7`, `2`, `-9`, `7`). Not a single `7 + 2 = ?` line |
| Under the sum | Radio choices only. One option is selected at a time. There is no typed-answer box in this release |
| Bottom | **Previous**, **Save & Next**, **Submit Test** |
| Right rail | Colour key: Not answered, Answered, Marked for review, Not visited, Answered and marked for review. Then a grid of every question number so the child can jump |

The child can move to any question from the grid. Mark for review does not submit the paper. Submit Test hands the whole attempt in. When the overall clock hits zero, the attempt submits even if they have not pressed Submit.

Suggested age bands, pending confirmation: **5–7**, **8–11**, **12–14**.

Sample prices from the journeys, pending confirmation:

| Product | Sample price | Who pays |
|---|---|---|
| Unlimited practice | ₹199 once | Parent |
| One live seat | ₹350 | Parent, when they buy the seat themselves |
| Bulk voucher | ₹150 per seat | Academy. 80 seats = ₹12,000 |

---

## 5. Phases

Build in this order. Do not start vouchers, Google login, or anti-cheat before the paper can be locked.

### Phase A — Host brand and competition-only child

- Platform can mark a brand as a competition host.
- Only Competitions is on.
- The franchise Students directory does not list competition-only children.
- Parent creates a child on that host (name, date of birth, city or branch, parent email, parent phone).
- Age band is stored from the date of birth.
- The child can sign in and see only this host’s exams.

No blueprint and no payment in this phase.

**Done when:** an outside academy admin can sign in, and an outside child does not appear under any franchise.

### Phase B — Question bank and locked paper

Each bank question gains:

- Age band
- Category (example: Small Friend Addition)
- Difficulty: Easy, Medium, Hard
- Marks
- Optional spoken-text field
- Question type for this release: **multiple choice only** (one correct option)
- Official answer: the correct option. Staff can change that option after publish, until release

Course and level stay for franchise brands. A host brand may leave course empty and use age band plus category.

**CSV import columns:** prompt, answer, age band, category, difficulty, marks, optional speech text.

A row is rejected when the answer is missing, the difficulty is unknown, or marks are below 1. Success copy: “Successfully imported N questions into the Question Bank.”

**Create tournament**

| Field | Example |
|---|---|
| Title | National Abacus Speed Sprint 2026 |
| Start | Sunday, 10:00 AM IST |
| Duration | 10 minutes |
| Age band | One band, same band as the questions |
| Question count | 50 |
| Mix | 40% Easy (20), 30% Medium (15), 30% Hard (15). Percents must equal 100. Counts must equal the question count. |
| Marks | Easy 1, Medium 2, Hard 3. Sample total 95. |

**Auto-Assemble** picks that many questions, shows every question and its answer, and lets the admin replace one question before lock.

**Publish & Lock** checks:

- Every question has an answer.
- Speech text is present when speech is turned on for this exam.
- The admin confirms the pace. 50 questions in 10 minutes is 12 seconds each. The system does not publish that pace silently.

After publish, question order is fixed. Editing the bank does not change this paper. The admin can still open this paper and correct an official answer until the leaderboard is released. That correction rescores every attempt. See [Clock and live answer edits](#clock-and-live-answer-edits).

File upload of PDF / Excel / CSV **stays** for franchise events that only need a downloadable paper. It is not the live abacus exam.

### Phase C — Practice and payment

- The child must be in the exam’s age band.
- A practice paper is short (sample: 10 questions), drawn from the bank, and is **not** the locked tournament snapshot.
- Attempt 1 and attempt 2 are free.
- The result screen shows score, time, and step-by-step solutions. Sample copy: “Awesome job Aarav! You scored 9/10 in 1 minute 42 seconds!”
- Attempt 3 shows: “You have completed your 2 free practice rounds. Unlock unlimited practice for ₹199.”
- Payment uses the existing Razorpay path. Access opens when payment is captured.
- A failed or abandoned payment does not consume an attempt.
- Ages 5–7 use a large numpad and hear the speech text. Older bands can use the same numpad.
- Practice has no fullscreen rule and no strike log.

### Phase D — Vouchers and roster

- Host sets a seat price and a bulk price.
- Academy pays the bulk amount (sample ₹12,000) by UPI or net banking.
- The system issues 80 single-use codes (`ACAD-4821`, `ACAD-4822`, …).
- Admin can download the sheet or email each code.
- WhatsApp delivery waits until that provider is switched on. Email is enough for the first release.
- A code redeems onto **one child** and **one locked exam**. A second redeem fails.
- A code cannot be used for a different age band than the paper.
- A franchise center can upload a roster (name, date of birth, parent email, parent phone, branch label) into an event the host shared with that brand.
- Those children stay enrolled at their franchise and gain a registration on the host event. They are not copied into the host’s franchise directory.

### Phase E — Live exam, audit, certificate

**Lobby.** From 10 minutes before start (sample 09:50 IST), the child enters with the code or their login. The lobby shows a countdown from the **server** clock. The paper may download early. The answer box stays closed until the server says 10:00:00 has passed. Everyone then sees question 1.

**Exam clock.** When question 1 opens, the time-remaining clock starts from the full duration and counts down. At 00:00 the paper closes and submits. The clock does not pause for a tab warning or a network drop.

**During the exam.** The screen is the reference runner in [Reference exam screen](#reference-exam-screen): vertical sum, choices or a typed box, question grid, mark for review, and the time-left clock.

- Each answer is stored on the device and sent to the server.
- If the network drops, a banner says answers are saving on the device and the child keeps going.
- When the network returns, saved answers sync. The server keeps the first accepted answer for each question.
- Leaving fullscreen or switching away records warning 1, then warning 2. The child can return and continue.
- A third event is marked for audit. It does not end the attempt by itself.
- Sample warning copy: “Whoops! Please stay on this screen until the competition is over. (Warning 1 of 2)”

**Finish.** Score and duration are stored to the millisecond (sample: 49/50 in 06m 14s 320ms). The screen says results will be published after audit (sample time 10:25 IST, chosen by the admin, not hardcoded). Review stays closed.

**Mission Control.** In-progress count, submitted count, and open warnings. When the window ends, the board moves to **Under audit**.

**Release.** The admin opens each flagged attempt, confirms disqualification or clears it, then **Approve & Release**. Release:

- publishes rank inside the age band and branch label (sample: Rank 2, Silver Merit, Aarav Sharma, Ages 5–7, Pune Branch)
- opens answer review
- generates a PDF certificate with the host logo, the merit band, and the child’s name

Signature images are uploaded by the host admin. They are not hardcoded.

---

## 6. Screens and data by phase

| Phase | Admin sees | Parent or child sees | New records |
|---|---|---|---|
| A | Host brand with Competitions only | Create child, empty exam list | Host brand, competition-only enrollment, child profile |
| B | Import, blueprint, preview, lock. After publish, edit official answers until release | Nothing new until an exam is published | Question tags, exam, frozen order, editable answer key |
| C | Practice price | Two free tests, then pay ₹199 | Practice attempts, Razorpay payment |
| D | Buy vouchers, export or email codes, inbound roster | Redeem a code for one exam | Voucher batch, single-use codes, registration |
| E | Mission Control, audit queue, correct an official answer, release | Lobby countdown, then exam clock, held result, then rank and PDF | Attempt answers, strike log, answer-key edits, leaderboard release, certificate file |

Existing tables that stay in use:

- `brand_competitions`
- `competition_question_bank` and `competition_question_options`
- `brand_competition_questions` (the snapshot)
- `student_competition_registrations`, `student_competition_entries`
- `student_competition_attempts` and `student_competition_attempt_answers`

New concepts (names can change in design): host-brand flag, competition-only enrollment, numeric answer, blueprint, voucher, strike, audit decision, certificate file.

---

## 7. Out of scope

- A typed-answer box. This release is multiple choice only.
- Login with parent phone or student phone.
- Automatic disqualification on the third tab switch.
- A promise that a paper downloaded before the start cannot be read on the device. The server clock is the control that matters.
- Putting outside children on an existing franchise Students list.
- Letting one host edit another brand’s question bank.
- WhatsApp delivery of vouchers in the first release.

---

## 8. Decisions to mark before build

Reply with the number and your choice.

1. **Age bands.** Keep 5–7, 8–11, and 12–14, or send a different list.
2. **Answer type.** Confirmed for this release: multiple choice only, on the same screen as the reference runner. See [Reference exam screen](#reference-exam-screen).
3. **Speech.** Required for ages 5–7 in practice, or a later phase.
4. **Who can run a live exam first.** Competition-host brands only, or franchise brands as well.
5. **Prices.** Confirm ₹199 practice, ₹350 parent seat, and ₹150 bulk seat. When the academy buys a bulk voucher, does the parent pay anything else?
6. **Parent sign-in.** Google only, or Google plus email and password.
7. **Merit bands.** Example: rank 1 Gold, ranks 2–3 Silver, or a score cutoff. The sample only shows Silver for rank 2.
8. **Refunds.** No refund after the paper is locked, or refund until the start time.
