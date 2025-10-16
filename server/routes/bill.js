import express from "express"
import { auth ,authorize} from '../middleware/auth.js';
import Bill from "../models/Bill.js"
import Booking from "../models/Booking.js"
import mongoose from "mongoose"
import Garage from "../models/Booking.js"
import Customer from "../models/Customer.js"
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const router=express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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



// FECTH Bill FOR CUSTOMER


router.get('/bills/:id', auth, authorize('customer'), async (req, res) => {
  try {
    const { id } = req.params;
    const uid = req.user._id;

    const customer = await Customer.findOne({ user: uid });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
     
    const userId = customer._id;
    const booking = await Booking.findById(id).populate('customer mechanic garage');
    const bill = await Bill.findOne({bookingId:id});
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (booking.customer._id.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    if (booking.status !== 'completed' && booking.status !== 'billed') {
      return res.status(400).json({ message: 'Bill not available for this booking' });
    }

    // ================= CREATE PDF =================
    const doc = new PDFDocument({ margin: 50 });
    const filename = `bill_${booking._id}.pdf`;
    const filepath = path.join(__dirname, '../temp', filename);

    if (!fs.existsSync(path.dirname(filepath))) {
      fs.mkdirSync(path.dirname(filepath), { recursive: true });
    }

    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    // Brand Colors
    const brandColor = '#00B140';
    const textGray = '#555';

    // ================= HEADER =================
    const logoPath = path.join(__dirname, '../assets/logo.png');
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 50, 40, { width: 70 });
    }

    doc.fillColor(brandColor).fontSize(22).text('MECHIEE BIKE SERVICES', 190, 50);
    doc.fillColor(textGray).fontSize(10).text('Doorstep & Garage Servicing | Pune, India', 220, 75);
    doc.fillColor(textGray).fontSize(10).text('Customer Care: +918149297982 | www.mechiee.in', 210, 90);
    doc.moveTo(50, 110).lineTo(550, 110).strokeColor(brandColor).stroke();

    // ================= BILL TITLE =================
    doc.moveDown(2);
    doc.fillColor('#000').fontSize(18).text('SERVICE INVOICE', 70,120);
    doc.moveDown(1);

    // ================= BILL INFO =================
    doc.fontSize(12).fillColor('#000');
    doc.text(`Invoice ID: ${booking._id}`);
    doc.text(`Date: ${new Date(booking.updatedAt).toLocaleDateString()}`);
    doc.text(`Status: ${booking.status}`);
    doc.moveDown(1);

    // ================= CUSTOMER & GARAGE DETAILS BOX =================
    const boxTop = doc.y;
    doc.roundedRect(50, boxTop, 500, 90, 6).strokeColor(brandColor).stroke();

    doc.fontSize(13).fillColor(brandColor).text('Customer Details', 60, boxTop + 10);
    doc.fontSize(11).fillColor('#000').text(`Name: ${booking.name}`, 60, boxTop + 30);
    doc.text(`Bike Number: ${booking.bikeNumber}`, 60, boxTop + 45);
    doc.text(`Service Type: ${booking.serviceType}`, 60, boxTop + 60);

    doc.fontSize(13).fillColor(brandColor).text('Garage Details', 300, boxTop + 10);  
    doc.fontSize(11).fillColor('#000').text(`Garage: ${booking.garage.garageName}`, 300, boxTop + 30);
    doc.text(`Mechanic: ${booking.mechanic.name}`, 300, boxTop + 45);
    doc.text(`Contact: ${booking.garage.ownerPhone || 'N/A'}`, 300, boxTop + 60);
    doc.moveDown(6);

    // ================= SERVICE DESCRIPTION =================
    doc.fontSize(13).fillColor(brandColor).text('Service Description',70,350);
    doc.moveDown(0.4);
    doc.fontSize(11).fillColor(textGray).text(booking.description || 'No additional description provided.');
    doc.moveDown(1.5);

    // ================= BILL TABLE =================
    const total = bill.subtotal;
    const tax = bill.tax;
    const grandTotal = total + tax;

    const tableTop = doc.y;
    const tableLeft = 50;
    const tableRight = 550;

    // Table Header
    doc.roundedRect(tableLeft, tableTop, 500, 25, 4).fill(brandColor);
    doc.fillColor('white').fontSize(12);
    doc.text('S.No', tableLeft + 10, tableTop + 7);
    doc.text('Description', tableLeft + 60, tableTop + 7);
    doc.text('Amount', tableRight - 120, tableTop + 7, { width: 100, align: 'right' });

    // Table Body Background
    doc.fillColor('#F9F9F9').rect(tableLeft, tableTop + 25, 500, 75).fill();

    // Table Content
    doc.fillColor('#000').fontSize(12);
    let y = tableTop + 35;
    doc.text('1', tableLeft + 10, y);
    doc.text(booking.serviceType, tableLeft + 60, y);
    doc.text(total.toFixed(2), tableRight - 120, y, { width: 100, align: 'right' });

    y += 25;
    doc.text('2', tableLeft + 10, y);
    doc.text('GST (10%)', tableLeft + 60, y);
    doc.text(tax.toFixed(2), tableRight - 120, y, { width: 100, align: 'right' });

    // Grand Total Box
    y += 25;
    doc.roundedRect(tableLeft, y, 500, 25, 4).fill('#E9FFF1');
    doc.fillColor('#000').font('Helvetica-Bold').text('Total Payable', tableLeft + 60, y + 7);
    doc.text(`${grandTotal}/-`, tableRight - 120, y + 7, { width: 100, align: 'right' });

    doc.font('Helvetica').fillColor('#000');

    // ================= FOOTER =================
    doc.moveDown(3);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor(brandColor).stroke();
    doc.moveDown(1);
    doc.fontSize(10).fillColor(textGray).text('Thank you for choosing Mechiee!', { align: 'center' });
    doc.text('We appreciate your trust in our service.', { align: 'center' });
    
    doc.end();

    // ================= SEND PDF =================
    stream.on('finish', () => {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      const fileStream = fs.createReadStream(filepath);
      fileStream.pipe(res);
      fileStream.on('end', () => fs.unlinkSync(filepath));
    });

  } catch (error) {
    console.error('Error generating bill:', error);
    res.status(500).json({ message: 'Failed to generate bill' });
  }
});



export default router