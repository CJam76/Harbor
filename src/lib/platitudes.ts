export const PLATITUDES: string[] = [
  "Begin with what is in front of you; clarity arrives in the doing.",
  "Quiet progress compounds more reliably than sudden bursts.",
  "Every complex system was once a collection of simple thoughts written down.",
  "Give your ideas room to breathe before asking them to be perfect.",
  "Depth over volume. Deliberation over haste.",
  "A harbor is not built for stillness, but for safe return after long voyages.",
  "The craft of thinking improves when the workspace is calm.",
  "Structure is not a constraint; it is a scaffold for your finest work.",
  "Steady attention turns raw notes into enduring knowledge.",
  "Do not hurry the foundation upon which your project rests.",
  "Small daily entries outlast intermittent grand intentions.",
  "Clarity of thought begins with the courage to write the first draft.",
  "A project finished today teaches you more than a masterwork postponed.",
  "Protect your focus; it is your rarest and most fragile instrument.",
  "Let your ideas converse across pages, disciplines, and semesters.",
  "Order is the quiet companion of deep curiosity.",
  "One well-tended database can anchor a semester of research.",
  "Leave room in your margins for unexpected insights.",
  "When you organize your thoughts, you make peace with the future.",
  "Treat each task not as an obligation, but as a deliberate step forward.",
  "Patience is the currency that buys thorough understanding.",
  "Write to understand, not merely to record.",
  "The clearest maps are drawn after walking the terrain.",
  "A peaceful desk invites sustained inquiry.",
  "Knowledge isn't acquired all at once; it is woven thread by thread.",
  "Trust the discipline of taking one small note at a time.",
  "Every milestone was once an untracked thought in someone's head.",
  "Simplicity is the final outcome of careful reduction.",
  "Notice what sparks your curiosity today and anchor it here.",
  "Great work does not require noise; it requires persistence.",
  "Hold your plans with precision, but welcome their natural evolution.",
  "A disciplined mind finds immense freedom within structured spaces.",
  "Take pride in the craftsmanship of your personal archive.",
  "Distillation is the secret of memorable scholarship.",
  "The best time to organize a system is when it still feels manageable.",
  "Return to your notes with fresh eyes; perspective is a collaborator.",
  "Let quiet hours produce what hurried days cannot.",
  "A thoughtful student builds a library that serves a lifetime.",
  "Clear outlines allow creativity to flow without friction.",
  "Small acts of categorization pay compounding dividends.",
  "Do not measure your day solely by output, but by understanding gained.",
  "Rest your eyes, gather your intent, and begin with purpose.",
  "A mind free of clutter has room to synthesize the difficult truths.",
  "Build archives that your future self will be grateful to inherit.",
  "Focus is saying gentle no's to a thousand passing distractions.",
  "Turn the page; the next sentence will find its own cadence.",
  "Good research is less about discovery than about noticing patterns.",
  "An organized workspace is an invitation to begin without hesitation.",
  "Honor the slow accretion of meaningful insight.",
  "Your best work emerges when preparation meets undisturbed time.",
  "Every solved problem leaves a trail worth preserving.",
  "When the horizon seems wide, anchor yourself to the next single task.",
  "Treat your questions with the same respect as your conclusions.",
  "Quiet confidence is built one well-researched paragraph at a time.",
  "Everything you need to complete this work is within your reach."
];

/**
 * Returns a random platitude that is guaranteed not to equal the previous one.
 */
export function getRandomPlatitude(previous?: string): string {
  if (PLATITUDES.length <= 1) return PLATITUDES[0] || "";
  let next = PLATITUDES[Math.floor(Math.random() * PLATITUDES.length)];
  while (next === previous) {
    next = PLATITUDES[Math.floor(Math.random() * PLATITUDES.length)];
  }
  return next;
}
