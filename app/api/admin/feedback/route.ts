import { NextResponse } from 'next/server';
import { checkAuth } from '../../../../lib/auth';
import { getFeedbacks, getFeedbackSummaryStats } from '../../../../models/feedbackModel';

// GET /api/admin/feedback - List all customer evaluations and aggregated statistics
export async function GET(req: Request) {
  const auth = await checkAuth(req, true);
  if (auth.error) return auth.error;

  try {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '100', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);
    const search = url.searchParams.get('search') || '';

    const [{ feedbacks, total }, stats] = await Promise.all([
      getFeedbacks(limit, offset, search),
      getFeedbackSummaryStats(),
    ]);

    return NextResponse.json({
      feedbacks,
      total,
      stats,
    });
  } catch (error: any) {
    console.error('Admin feedback retrieval error:', error);
    return NextResponse.json({ message: error.message || 'Server error' }, { status: 500 });
  }
}
