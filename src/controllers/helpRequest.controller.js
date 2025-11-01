import User from "../models/user.model.js";
import Notification from "../models/notification.model.js";
import HelpRequest from "../models/helpRequest.model.js";

/**
 * POST /api/help-requests
 * Send help request to nearby helpers
 */
export const sendHelpRequest = async (req, res) => {
  try {
    const { location, radius } = req.body;
    if (!location || !location.lat || !location.lng) {
      return res.status(400).json({
        success: false,
        message: "Location (lat, lng) is required",
      });
    }

    const lat = Number(location.lat);
    const lng = Number(location.lng);
    const radiusKm = Number(radius) || 3;
    const maxDistance = radiusKm * 1000;

    // 1️⃣ Nearby helpers খোঁজা
    const nearby = await User.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [lng, lat] },
          distanceField: "distance",
          maxDistance,
          spherical: true,
          query: { role: { $in: ["giver", "both"] } },
        },
      },
      { $limit: 10 },
      { $project: { fullname: 1, profileImage: 1, distance: 1 } },
    ]);

    const results = nearby.map((u) => ({
      _id: u._id,
      name: u.fullname,
      photo: u.profileImage,
      distance: (u.distance / 1000).toFixed(2),
      eta: `${Math.ceil((u.distance / 1000) / 5 * 60)} mins`,
    }));

    // 2️⃣ HelpRequest তৈরি করা (DB তে save)
    const seeker = req.user;
    const helpRequest = await HelpRequest.create({
      seeker: seeker._id,
      location: { type: "Point", coordinates: [lng, lat] },
      status: "pending",
      message: `Help request by ${seeker.fullname}`,
    });

    // 3️⃣ Notification তৈরি করা
    const notifications = results.map((g) => ({
      message: `🚨 New help request from ${seeker.fullname}`,
      sender: seeker._id,
      receiver: g._id,
      receiverRole: "giver",
      relatedRequest: helpRequest._id,
      status: "unread",
    }));
    await Notification.insertMany(notifications);


    // 4️⃣ Socket.IO event emit (real-time broadcast)
    const io = req.app.get("io");
    if (io) {
      results.forEach((giver) => {
        io.emitToUser(giver._id.toString(), "newHelpRequest", {
          from: { _id: seeker._id, name: seeker.fullname, photo: seeker.profileImage },
          location,
          radius: radiusKm,
          requestId: helpRequest._id,
          timestamp: new Date(),
        });
      });
    }

    return res.status(200).json({ success: true, data: results });
  } catch (error) {
    console.error("Help request error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error while processing help request",
    });
  }
};

/**
 * PATCH /api/help-requests/:requestId
 * Cancel or complete a help request
 */
export const updateHelpRequestStatus = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status } = req.body;

    if (!["cancelled", "completed"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Use 'cancelled' or 'completed'",
      });
    }

    const helpRequest = await HelpRequest.findById(requestId);
    if (!helpRequest) {
      return res.status(404).json({ success: false, message: "Help request not found" });
    }

    if (
      String(helpRequest.seeker) !== String(req.user._id) &&
      String(helpRequest.giver) !== String(req.user._id)
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this request",
      });
    }

    helpRequest.status = status;
    await helpRequest.save();

    // ✅ Emit status update socket event (real-time)
    const io = req.app.get("io");
    if (io) {
      io.emitToUser(helpRequest.seeker.toString(), "helpRequestStatus", {
        requestId,
        status,
        updatedBy: req.user._id,
      });
      if (helpRequest.giver) {
        io.emitToUser(helpRequest.giver.toString(), "helpRequestStatus", {
          requestId,
          status,
          updatedBy: req.user._id,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Request updated successfully",
      data: { _id: helpRequest._id, status: helpRequest.status },
    });
  } catch (error) {
    console.error("Update Help Request Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error while updating help request",
    });
  }
};

/**
 * GET /api/help-requests/:requestId/helpers
 * Get nearby helpers for a given request
 */
export const getNearbyHelpers = async (req, res) => {
  try {
    const { requestId } = req.params;
    const helpRequest = await HelpRequest.findById(requestId);

    if (!helpRequest) {
      return res.status(404).json({
        success: false,
        message: "Help request not found",
      });
    }

    const [lng, lat] = helpRequest.location?.coordinates || [];
    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: "Help request location is missing",
      });
    }

    const nearby = await User.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [lng, lat] },
          distanceField: "distance",
          maxDistance: 3000,
          spherical: true,
          query: { role: { $in: ["giver", "both"] } },
        },
      },
      { $limit: 10 },
      { $project: { fullname: 1, profileImage: 1, location: 1, distance: 1 } },
    ]);

    const helpers = nearby.map((u) => ({
      _id: u._id,
      name: u.fullname,
      photo: u.profileImage,
      distance: (u.distance / 1000).toFixed(2),
      eta: `${Math.ceil((u.distance / 1000) / 5 * 60)} mins`,
      location: {
        lat: u.location?.coordinates?.[1],
        lng: u.location?.coordinates?.[0],
      },
    }));

    return res.status(200).json({ success: true, data: helpers });
  } catch (error) {
    console.error("Get Nearby Helpers Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error while fetching helpers",
    });
  }
};

/**
 * GET /api/help-requests/:requestId/map
 * Live map (active helpers only)
 */
export const getLiveMapData = async (req, res) => {
  try {
    const { requestId } = req.params;
    const request = await HelpRequest.findById(requestId).populate(
      "helpers.user",
      "fullname profileImage role"
    );

    if (!request) {
      return res.status(404).json({ success: false, message: "Help request not found" });
    }

    const activeHelpers = request.helpers
      .filter((h) => h.lastLocation?.lat && h.lastLocation?.lng)
      .map((h) => ({
        _id: h.user._id,
        name: h.user.fullname,
        photo: h.user.profileImage,
        role: h.user.role,
        location: h.lastLocation,
        status: h.status,
      }));

    res.status(200).json({ success: true, data: activeHelpers });
  } catch (err) {
    console.error("Live map error:", err);
    res.status(500).json({ success: false, message: "Server error while fetching live map" });
  }
};

/**
 * GET /api/help-requests/:requestId/map/full
 * Full map (all helpers + seeker)
 */
export const getFullMapData = async (req, res) => {
  try {
    const { requestId } = req.params;
    const request = await HelpRequest.findById(requestId)
      .populate("seeker", "fullname profileImage location")
      .populate("helpers.user", "fullname profileImage role location");

    if (!request) {
      return res.status(404).json({ success: false, message: "Help request not found" });
    }

    const allHelpers = request.helpers.map((h) => ({
      _id: h.user._id,
      name: h.user.fullname,
      photo: h.user.profileImage,
      role: h.user.role,
      status: h.status,
      lastLocation: h.lastLocation,
      startLocation: request.location,
    }));

    res.status(200).json({
      success: true,
      data: {
        seeker: {
          _id: request.seeker._id,
          name: request.seeker.fullname,
          photo: request.seeker.profileImage,
          location: request.location,
        },
        helpers: allHelpers,
      },
    });
  } catch (err) {
    console.error("Full map error:", err);
    res.status(500).json({ success: false, message: "Server error while fetching full map" });
  }
};
