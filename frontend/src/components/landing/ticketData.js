// components/landing/ticketData.js
// Ticket data for 3 clothesline ropes.
// type: 'resolved' → AI answers with steps/doc link (green back card)
// type: 'escalated' → AI escalates to human agent (amber back card)

export const ROPE1 = [
  {
    initials: 'RK', bg: '#C8841A', badge: 'URGENT', rotate: -7,
    name: 'rahul.k@getmyapp.co', time: '3 days ago',
    msg: 'Been waiting 3 days with zero reply. Is anyone actually working there?',
    type: 'escalated',
    reply: "Hi Rahul, I can see 3 days is far too long and I'm sorry. I'm flagging this as urgent and connecting you with our support team right now. They'll have full context of your case.",
    resolvedIn: '9s',
  },
  {
    initials: 'SM', bg: '#1A3FCC', badge: null, rotate: 5,
    name: 'sara.m@mybiz.io', time: '2 days ago',
    msg: 'Account locked and I have a client deadline TOMORROW. Please help.',
    type: 'escalated',
    reply: "Hi Sara! Account lockouts need hands-on access from our team. I'm escalating this as URGENT right now. An agent will respond within 15 minutes with your deadline noted.",
    resolvedIn: '7s',
  },
  {
    initials: 'TK', bg: '#9B2C2C', badge: 'URGENT', rotate: -4,
    name: 'tom.k@inc.co', time: '1 day ago',
    msg: 'You charged my card TWICE this month. I need a refund right now.',
    type: 'escalated',
    reply: "Hi Tom! Duplicate charges require manual verification by our billing team. I'm connecting you with a billing agent who can confirm and process your refund directly.",
    resolvedIn: '11s',
  },
  {
    initials: 'AJ', bg: '#2D6A4F', badge: null, rotate: 8,
    name: 'anon.j@user.net', time: '4 hrs ago',
    msg: "Hello? 4 tickets submitted and heard nothing. What is going on?",
    type: 'escalated',
    reply: "Hi! I found all 4 tickets. They were misrouted. I've merged them with URGENT priority and an agent is being assigned right now. So sorry for the silence.",
    resolvedIn: '13s',
  },
  {
    initials: 'NP', bg: '#9B2C2C', badge: 'URGENT', rotate: -5,
    name: 'nisha.p@works.in', time: '5 hrs ago',
    msg: "Can't log in for 2 weeks. Missed two billing cycles. This is a joke.",
    type: 'escalated',
    reply: "Hi Nisha! Two weeks is unacceptable, I'm sorry. Login and billing issues of this duration need our account team. Escalating now with full history attached.",
    resolvedIn: '8s',
  },
]

export const ROPE2 = [
  {
    initials: 'MP', bg: '#9B2C2C', badge: 'URGENT', rotate: 6,
    name: 'mike.p@premium.co', time: '22 hrs ago',
    msg: 'App crashed mid-presentation and wiped my work. This is a disaster.',
    type: 'escalated',
    reply: "Hi Mike! Data loss is critical. I'm escalating to our engineering team immediately. They'll investigate your session and reach you within 30 minutes.",
    resolvedIn: '6s',
  },
  {
    initials: 'PK', bg: '#C8841A', badge: null, rotate: -6,
    name: 'priya.k@startup.in', time: '8 hrs ago',
    msg: "Asked how to cancel 5 times. Zero response. I'm disputing this charge.",
    type: 'resolved',
    reply: "Hi Priya! Here's how to cancel: 1. Go to Settings, then Billing 2. Click 'Cancel Plan' 3. Select reason and confirm. Full guide: help.supportos.co/cancel. Done in 2 min!",
    resolvedIn: '5s',
  },
  {
    initials: 'LW', bg: '#1A3FCC', badge: null, rotate: 4,
    name: 'lisa.w@works.com', time: '2 hrs ago',
    msg: 'Simple billing question - 48 hours and still no answer. Unbelievable.',
    type: 'resolved',
    reply: "Hi Lisa! Your $29/month covers up to 5 seats and 1,000 AI replies. Charges hit on the 1st. Full billing breakdown: help.supportos.co/billing. What else can I clarify?",
    resolvedIn: '4s',
  },
  {
    initials: 'JN', bg: '#9B2C2C', badge: 'URGENT', rotate: -7,
    name: 'james.n@nohelp.xyz', time: 'just now',
    msg: '3rd ticket on the same issue. Something is seriously broken here.',
    type: 'escalated',
    reply: "Hi James! 3 tickets on the same bug is on us, I'm sorry. I'm escalating to our engineering team with all 3 tickets linked. You won't have to repeat yourself.",
    resolvedIn: '10s',
  },
  {
    initials: 'VR', bg: '#C8841A', badge: null, rotate: 5,
    name: 'vivek.r@company.in', time: '10 hrs ago',
    msg: 'Where is my invoice? I need it for tax filing today. Anyone there??',
    type: 'resolved',
    reply: "Hi Vivek! To download your invoice: 1. Go to Settings, then Billing, then Invoice History 2. Click the March row, then Download PDF. Or visit: app.supportos.co/invoices",
    resolvedIn: '3s',
  },
]

export const ROPE3 = [
  {
    initials: 'EK', bg: '#2D6A4F', badge: null, rotate: -4,
    name: 'erin.k@agency.co', time: '1 hr ago',
    msg: 'My entire team lost access overnight. We literally cannot work today.',
    type: 'escalated',
    reply: "Hi Erin! Team-wide access loss is an account-level issue that needs our team directly. Escalating as CRITICAL now. An agent will be with you in under 10 minutes.",
    resolvedIn: '8s',
  },
  {
    initials: 'BR', bg: '#1A3FCC', badge: 'URGENT', rotate: 7,
    name: 'ben.r@firm.io', time: '30 min ago',
    msg: "Going to dispute this with my bank if I don't hear back today.",
    type: 'escalated',
    reply: "Hi Ben! Please don't dispute. I'm connecting you with our billing team right now. They can resolve this directly and faster than a bank dispute. Standby.",
    resolvedIn: '6s',
  },
  {
    initials: 'CL', bg: '#9B2C2C', badge: 'URGENT', rotate: -5,
    name: 'claire.l@shop.com', time: '6 hrs ago',
    msg: 'My customers are seeing checkout errors. Please respond ASAP.',
    type: 'escalated',
    reply: "Hi Claire! Checkout errors affecting your customers need our technical team urgently. Escalating now. They'll investigate your integration and respond within 20 minutes.",
    resolvedIn: '7s',
  },
  {
    initials: 'DS', bg: '#C8841A', badge: null, rotate: 6,
    name: 'david.s@co.io', time: '4 hrs ago',
    msg: 'I upgraded my plan two weeks ago and still see the old features.',
    type: 'resolved',
    reply: "Hi David! Try this: 1. Log out and log back in 2. Clear browser cache (Ctrl+Shift+Del) 3. Check Settings, then Plan to confirm Pro is active. Guide: help.supportos.co/plan-upgrade",
    resolvedIn: '4s',
  },
  {
    initials: 'HM', bg: '#1A3FCC', badge: null, rotate: -3,
    name: 'hana.m@brand.co', time: '8 hrs ago',
    msg: "Password reset email never arrives. Checked spam 20+ times.",
    type: 'resolved',
    reply: "Hi Hana! Try these steps: 1. Check hana.m@brand.co spam/junk 2. Whitelist no-reply@supportos.co 3. Try a different browser. Still stuck? Visit help.supportos.co/reset-password",
    resolvedIn: '5s',
  },
]
