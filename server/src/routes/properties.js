import { Router } from "express";
import {
  addUnitToProperty,
  createProperty,
  deletePropertyById,
  deleteUnitFromProperty,
  findPropertyById,
  listProperties
} from "../data/properties.js";

const router = Router();

router.get("/", (req, res) => {
  res.json({
    data: listProperties()
  });
});

router.post("/", (req, res) => {
  try {
    const property = createProperty(req.body || {});
    res.status(201).json({ data: property });
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
});

router.get("/:propertyId", (req, res) => {
  const property = findPropertyById(req.params.propertyId);

  if (!property) {
    return res.status(404).json({ error: "Property not found" });
  }

  res.json({ data: property });
});

router.delete("/:propertyId", (req, res) => {
  try {
    deletePropertyById(req.params.propertyId);
    res.status(204).end();
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
});

router.delete("/:propertyId/units/:unitId", (req, res) => {
  try {
    const result = deleteUnitFromProperty(req.params.propertyId, req.params.unitId);
    res.json({ data: result });
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
});

router.post("/:propertyId/units", (req, res) => {
  try {
    const result = addUnitToProperty(req.params.propertyId, req.body || {});
    res.status(201).json({ data: result });
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message });
  }
});

router.get("/:propertyId/units/:unitId", (req, res) => {
  const property = findPropertyById(req.params.propertyId);
  const phaseWithUnit = property?.phases.find((phase) =>
    phase.units.some((unit) => unit.id === req.params.unitId)
  );
  const unit = phaseWithUnit?.units.find((unit) => unit.id === req.params.unitId);

  if (!property || !unit) {
    return res.status(404).json({ error: "Unit not found" });
  }

  res.json({
    data: {
      property: { id: property.id, name: property.name, type: property.type },
      phase: phaseWithUnit ? { id: phaseWithUnit.id, name: phaseWithUnit.name } : null,
      unit
    }
  });
});

export default router;
