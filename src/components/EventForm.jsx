import { useState } from "react";
import { Input } from "./ui/Input";
import { Button } from "./ui/Button";
import { Label } from "./ui/Label";
import { MapPin, Type, AlignLeft, Mail } from "lucide-react";

export const EventForm = ({ onSubmit, initialData = {}, isEditing = false }) => {
    const [formData, setFormData] = useState({
        title: initialData.title || "",
        description: initialData.description || "",
        location: initialData.location || "",
        hostEmail: initialData.hostEmail || "",
        guestEmail: initialData.guestEmail || "",
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="hostEmail" className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" /> Host Email
                </Label>
                <Input
                    id="hostEmail"
                    name="hostEmail"
                    type="email"
                    placeholder="parent@example.com"
                    required
                    value={formData.hostEmail}
                    onChange={handleChange}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="guestEmail" className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" /> Guest Email{" "}
                    <span className="text-muted-foreground font-normal">(Optional)</span>
                </Label>
                <Input
                    id="guestEmail"
                    name="guestEmail"
                    type="email"
                    placeholder="friend@example.com"
                    value={formData.guestEmail}
                    onChange={handleChange}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="title" className="flex items-center gap-2">
                    <Type className="w-4 h-4 text-muted-foreground" /> Event Title
                </Label>
                <Input
                    id="title"
                    name="title"
                    placeholder="Bike date with Nile x Kai"
                    required
                    value={formData.title}
                    onChange={handleChange}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="location" className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" /> Location
                </Label>
                <Input
                    id="location"
                    name="location"
                    placeholder="Nealon Park"
                    required
                    value={formData.location}
                    onChange={handleChange}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="description" className="flex items-center gap-2">
                    <AlignLeft className="w-4 h-4 text-muted-foreground" /> Description{" "}
                    <span className="text-muted-foreground font-normal">(Optional)</span>
                </Label>
                <Input
                    id="description"
                    name="description"
                    placeholder="Let's ride bikes and explore the trails!"
                    value={formData.description}
                    onChange={handleChange}
                />
            </div>

            <Button type="submit" className="w-full" size="lg">
                {isEditing ? "Save Changes" : "Next: Select Times"}
            </Button>
        </form>
    );
};
