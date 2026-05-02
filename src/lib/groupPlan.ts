/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export type GroupPlan = {
  id: string;
  city: string;
  created_by: string;
  status: "voting" | "spinning" | "decided";
  winner_event_id: string | null;
  created_at: string;
};

export type GroupVote = {
  id: string;
  plan_id: string;
  voter_name: string;
  event_id: string;
  vote: boolean;
  created_at: string;
};

export async function createGroupPlan(city: string, createdBy: string): Promise<GroupPlan> {
  const { data, error } = await db
    .from("group_plans")
    .insert({ city, created_by: createdBy, status: "voting" })
    .select().single();
  if (error) throw error;
  return data as GroupPlan;
}

export async function getGroupPlan(id: string): Promise<GroupPlan | null> {
  const { data, error } = await db.from("group_plans").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as GroupPlan | null;
}

export async function getGroupVotes(planId: string): Promise<GroupVote[]> {
  const { data, error } = await db.from("group_plan_votes").select("*").eq("plan_id", planId);
  if (error) throw error;
  return (data ?? []) as GroupVote[];
}

export async function submitVotes(
  planId: string,
  voterName: string,
  votes: { event_id: string; vote: boolean }[]
): Promise<void> {
  const rows = votes.map((v) => ({ plan_id: planId, voter_name: voterName, ...v }));
  const { error } = await db.from("group_plan_votes").insert(rows);
  if (error) throw error;
}

export async function setWinner(planId: string, eventId: string): Promise<void> {
  const { error } = await db.from("group_plans").update({ status: "decided", winner_event_id: eventId }).eq("id", planId);
  if (error) throw error;
}

/** Tally votes → sorted by score, returns top candidates for the wheel */
export function tallyVotes(votes: GroupVote[], minCandidates = 3): string[] {
  const scores: Record<string, number> = {};
  for (const v of votes) {
    scores[v.event_id] = (scores[v.event_id] ?? 0) + (v.vote ? 1 : -1);
  }
  if (Object.keys(scores).length === 0) return [];
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const topScore = sorted[0][1];
  // All events with positive votes (or tied at top)
  const candidates = sorted.filter(([, s]) => s > 0 || (s === topScore && topScore >= 0)).map(([id]) => id);
  // Ensure at least minCandidates on the wheel
  const extra = sorted.slice(candidates.length).map(([id]) => id);
  return [...candidates, ...extra].slice(0, Math.max(candidates.length, minCandidates));
}
