import * as historyRepo from "../repositories/history.repository.js";

export const getHistory = async (req, res, next) => {
  try {
    const { role, userId } = req.query;
    const data = await historyRepo.getUserHistory(userId, role);
    res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
};

export const addHistory = async (req, res, next) => {
  try {
    const data = await historyRepo.createHistory(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

export const removeHistory = async (req, res, next) => {
  try {
    await historyRepo.deleteHistory(req.params.id);
    res.status(200).json({ success: true, message: "History deleted successfully" });
  } catch (err) { next(err); }
};

export const getStats = async (req, res, next) => {
  try {
    const { userId } = req.query;
    const stats = await historyRepo.getHistoryStats(userId);
    res.status(200).json({ success: true, ...stats });
  } catch (err) { next(err); }
};
