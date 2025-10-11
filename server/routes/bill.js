import express from "express"
import { auth ,authorize} from '../middleware/auth.js';
import Bill from "../models/Bill.js"
import Booking from "../models/Booking.js"
import mongoose from "mongoose"
import Garage from "../models/Booking.js"
const router=express.Router();

router.get("/:id", auth, authorize('garage'), async (req, res) => {
  const { id } = req.params;

  try {
    // Validate MongoDB ObjectId
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID format",
      });
    }

    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    res.json({
      success: true,
      message: "Booking fetched successfully",
      data: booking,
    });
  } catch (error) {
    console.error("Error fetching booking:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching booking",
    });
  }
});


router.post('/', auth, authorize('garage'), async (req, res) => {
  try {
    const {
      bookingId,
      customerId,
      customerName,
      customerPhone,
      customerBikeNumber,
      garage, // Keep as 'garage' to match request body
      items,
      subtotal,
      tax,
      discount,
      total,
      notes,
    } = req.body;

    // Log request body for debugging
    // console.log('Request body:', req.body);

    // Validate required fields
    if (
      !bookingId ||
      !customerId ||
      !customerName ||
      !customerPhone ||
      !customerBikeNumber ||
      !garage ||
      !items ||
      !subtotal ||
      !total
    ) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    // Validate garage (ObjectId format)
    if (!mongoose.Types.ObjectId.isValid(garage)) {
      console.log('Invalid garage ID:', garage); // Log the actual garage value
      return res.status(400).json({ message: 'Invalid garage ID format', garage });
    }

    // Find garageName from Garage model
    const garageObj = await Garage.find({_id:garage});
  
if (!garageObj) {
  console.log('Garage not found for ID:', garage); // Log for debugging
  return res.status(404).json({ message: 'Garage not found', garageObj });
}


    // Validate items array
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'At least one item is required' });
    }

    // Validate each item
    for (const item of items) {
      if (!item.id || !item.description || !item.quantity || !item.rate || !item.amount) {
        return res.status(400).json({ message: 'All item fields are required' });
      }
      if (item.quantity < 1 || item.rate < 0 || item.amount < 0) {
        return res.status(400).json({ message: 'Invalid item values' });
      }
    }

    // Validate numeric fields
    if (subtotal < 0 || (tax && tax < 0) || (discount && discount < 0) || total < 0) {
      return res.status(400).json({ message: 'Numeric values cannot be negative' });
    }

    const booking=await Booking.findById(bookingId)
    booking.totalAmount=total;
    await booking.save()
    // Create new bill
    const newBill = new Bill({
      bookingId,
      customerId,
      customerName,
      customerPhone,
      customerBikeNumber,
      garageId: garage, // Map 'garage' from request to 'garageId' in schema
      garageName: garageObj.garageName, // Get name from garage document
      items,
      subtotal,
      tax: tax || 0,
      discount: discount || 0,
      total,
      notes,
    });

    // Save bill to database
    const savedBill = await newBill.save();

    // Return success response
    res.status(201).json({
      message: 'Bill created successfully',
      bill: savedBill,
    });
  } catch (error) {
    console.error('Error creating bill:', error);
    res.status(500).json({
      message: 'Error creating bill',
      error: error.message,
    });
  }
});

export default router