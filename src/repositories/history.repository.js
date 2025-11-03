import History from "../models/history.model.js";

export const createHistory = async (data) => await History.create(data);

export const getUserHistory = async (userId, role) => {
  const filter = { userId };
  if (role) filter.role = role;
  return await History.find(filter).sort({ createdAt: -1 });
};

export const deleteHistory = async (id) => await History.findByIdAndDelete(id);

export const getHistoryStats = async (userId) => {
  const total = await History.countDocuments({ userId });
  const helped = await History.countDocuments({ userId, status: "Helped" });
  const declined = await History.countDocuments({ userId, status: "Declined" });
  return { totalRequests: total, helped, declined };
};
