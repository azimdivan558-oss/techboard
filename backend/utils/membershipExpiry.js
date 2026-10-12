import User from "../models/User.js";
import MembershipTier from "../models/MembershipTier.js";

/**
 * Downgrade expired paid memberships to the active Free plan.
 * This is intentionally idempotent, so it is safe to run repeatedly.
 */
export const expireMemberships = async () => {
  const now = new Date();

  const freeTier = await MembershipTier.findOne({
    isActive: true,
    price: 0
  }).sort({ price: 1 });

  if (!freeTier) {
    console.warn("MEMBERSHIP EXPIRY: No active free tier found.");
    return { expiredCount: 0, reason: "NO_FREE_TIER" };
  }

  const result = await User.updateMany(
    {
      membershipStatus: "active",
      membershipEnd: { $lte: now },
      membershipTier: { $ne: freeTier._id }
    },
    {
      $set: {
        membershipTier: freeTier._id,
        membershipStatus: "free",
        membershipStart: null,
        membershipEnd: null
      }
    }
  );

  if (result.modifiedCount > 0) {
    console.log(
      `MEMBERSHIP EXPIRY: ${result.modifiedCount} membership(s) downgraded to Free.`
    );
  }

  return {
    expiredCount: result.modifiedCount || 0,
    reason: "OK"
  };
};

/**
 * Check one user's membership and downgrade it immediately when expired.
 */
export const expireMembershipForUser = async (user) => {
  if (!user) return user;

  const now = new Date();

  if (
    user.membershipStatus !== "active" ||
    !user.membershipEnd ||
    new Date(user.membershipEnd) > now
  ) {
    return user;
  }

  const freeTier = await MembershipTier.findOne({
    isActive: true,
    price: 0
  }).sort({ price: 1 });

  if (!freeTier) {
    user.membershipStatus = "expired";
    await user.save();
    return user;
  }

  user.membershipTier = freeTier._id;
  user.membershipStatus = "free";
  user.membershipStart = null;
  user.membershipEnd = null;

  await user.save();

  return user;
};
