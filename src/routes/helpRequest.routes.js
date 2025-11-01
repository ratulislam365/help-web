import express from "express";
import { sendHelpRequest ,updateHelpRequestStatus , getNearbyHelpers ,  getLiveMapData, getFullMapData} from "../controllers/helpRequest.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
// import helpRequestModel from "../models/helpRequest.model.js";

const router = express.Router();


// Send Help Request (already made)
router.post("/", protect, sendHelpRequest);


// Cancel / Complete Request
router.patch("/:requestId", protect, updateHelpRequestStatus);

// helpRequestModel
router.get("/:requestId/helpers", protect, getNearbyHelpers);

// viwe map and full map
router.get("/:requestId/map", protect, getLiveMapData);
router.get("/:requestId/map/full", protect, getFullMapData);

export default router;
