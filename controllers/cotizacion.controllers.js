import { Cotizacion } from '../models/cotizacion.models.js';

export const createCotizacion = async (req, res) => {
    try {
        const newCotizacion = new Cotizacion(req.body);
        await newCotizacion.save();
        res.status(201).json(newCotizacion);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getCotizaciones = async (req, res) => {
    try {
        const cotizaciones = await Cotizacion.find().sort({ createdAt: -1 });
        res.status(200).json(cotizaciones);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateCotizacion = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedCotizacion = await Cotizacion.findByIdAndUpdate(id, req.body, { new: true });
        res.status(200).json(updatedCotizacion);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteCotizacion = async (req, res) => {
    try {
        const { id } = req.params;
        await Cotizacion.findByIdAndDelete(id);
        res.status(200).json({ message: 'Cotización eliminada' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
