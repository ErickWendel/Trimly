const STORAGE_KEYS = {
    PROFESSIONALS: 'trimly-professionals',
    AVAILABLE_TIMES: 'trimly-available-times',
    AGENDA: 'trimly-agenda'
};

const DATA_FILES = {
    PROFESSIONALS: '/src/config/mockProfessionals.json',
    AVAILABLE_TIMES: '/src/config/mockData.json'
};

const DATE_FORMAT = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
};

export class BarberService {
    constructor() {
        this.professionals = [];
        this.dateFormatter = new Intl.DateTimeFormat('en-CA', DATE_FORMAT);
    }

    async getProfessionals() {
        if (this.professionals.length) {
            return this.professionals;
        }

        this.professionals = await this.#getStorageData(
            STORAGE_KEYS.PROFESSIONALS,
            DATA_FILES.PROFESSIONALS
        );

        return this.professionals;
    }

    async #getStorageData(key, fallbackUrl = null) {
        const storedData = localStorage.getItem(key);

        if (!storedData && fallbackUrl) {
            const baseUrl = window.location.href
            const response = await fetch(`${baseUrl}${fallbackUrl}`);
            const data = await response.json();
            localStorage.setItem(key, JSON.stringify(data));
            return data;
        }

        return JSON.parse(storedData || '[]');
    }

    async #saveStorageData(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    }

    async #loadAvailableTimes(professionalId = null) {
        const allTimes = await this.#getStorageData(
            STORAGE_KEYS.AVAILABLE_TIMES,
            DATA_FILES.AVAILABLE_TIMES
        );

        const availableTimes = allTimes.available || [];

        return professionalId
            ? availableTimes.filter(time => time.professionals.includes(professionalId))
            : availableTimes;
    }

    async scheduleAppointment({ datetime, professionalId }) {
        const appointments = await this.getAppointments();
        const availableTimes = await this.#loadAvailableTimes();
        const timeSlotIndex = availableTimes.findIndex(slot =>
            this.#convertScheduleToDateTime(datetime, slot.schedule).getTime() === datetime.getTime() &&
            slot.professionals.includes(professionalId)
        );

        if (timeSlotIndex === -1) {
            throw new Error('Time slot not available for this professional');
        }

        const timeSlot = availableTimes[timeSlotIndex];
        const professionals = await this.getProfessionals();
        const newAppointment = {
            id: crypto.randomUUID(),
            datetime,
            professional: professionals.find(p => p.id === professionalId),
            schedule: timeSlot.schedule
        };

        appointments.push(newAppointment);
        await this.#saveStorageData(STORAGE_KEYS.AGENDA, appointments);

        // Remove the professional from the timeslot
        timeSlot.professionals = timeSlot.professionals.filter(id => id !== professionalId);

        // If no professionals are left for this slot, remove the slot
        if (timeSlot.professionals.length === 0) {
            availableTimes.splice(timeSlotIndex, 1);
        }

        await this.#saveStorageData(
            STORAGE_KEYS.AVAILABLE_TIMES,
            { available: availableTimes }
        );

        return newAppointment;
    }

    async cancelAppointment(appointmentId) {
        const appointments = await this.getAppointments();
        const appointmentIndex = appointments.findIndex(apt => apt.id === appointmentId);

        if (appointmentIndex === -1) {
            throw new Error('Appointment not found');
        }

        const appointment = appointments[appointmentIndex];
        const availableTimes = await this.#loadAvailableTimes();

        const timeSlot = availableTimes.find(slot => slot.schedule === appointment.schedule);

        if (timeSlot) {
            // If the timeslot exists, add the professional back
            if (!timeSlot.professionals.includes(appointment.professional.id)) {
                timeSlot.professionals.push(appointment.professional.id);
            }
        } else {
            // If the timeslot doesn't exist, create it
            availableTimes.push({
                schedule: appointment.schedule,
                professionals: [appointment.professional.id]
            });
        }

        // Sort by schedule to keep the data tidy
        availableTimes.sort((a, b) => a.schedule - b.schedule);

        await this.#saveStorageData(
            STORAGE_KEYS.AVAILABLE_TIMES,
            { available: availableTimes }
        );

        // Remove appointment
        appointments.splice(appointmentIndex, 1);
        await this.#saveStorageData(STORAGE_KEYS.AGENDA, appointments);

        return true;
    }

    async getAppointments() {
        return (await this.#getStorageData(STORAGE_KEYS.AGENDA)).sort((a, b) => a.datetime - b.datetime);
    }

    #convertScheduleToDateTime(date, schedule) {
        const dateObj = new Date(date);
        const [hours, minutes] = schedule.split(':').map(Number);
        // Set the time on the given date, preserving the original date part
        dateObj.setHours(hours, minutes, 0, 0);
        return dateObj;
    }

    async getAgenda({ datetime, professionalId }) {
        const professionals = await this.getProfessionals();
        const professionalName = professionalId ? professionals.find(p => p.id === professionalId)?.name : null;

        // 1. Get all available time slots for the given day
        const allTimes = await this.#loadAvailableTimes();
        if (!allTimes.length) {
            return {
                available: false,
                professional: professionalName,
                otherTime: "No slots available for this day."
            };
        }

        // 2. Filter slots by the requested professional, if one was provided
        const professionalSlots = professionalId
            ? allTimes.filter(slot => slot.professionals.includes(professionalId))
            : allTimes;

        if (!professionalSlots.length) {
            const nextAvailableTime = this.#convertScheduleToDateTime(datetime, allTimes[0].schedule);
            return {
                available: false,
                professional: professionalName,
                otherTime: nextAvailableTime.toLocaleString()
            };
        }

        // 3. Check if the specific datetime is in the professional's available slots
        const chosenSlot = professionalSlots.find(slot =>
            this.#convertScheduleToDateTime(datetime, slot.schedule).getTime() === datetime?.getTime()
        );

        const isAvailable = !!chosenSlot;

        // 4. If not available, suggest the next available time for that professional
        const otherTime = isAvailable ? null : this.#convertScheduleToDateTime(datetime, professionalSlots[0].schedule).toLocaleString();

        return {
            available: isAvailable,
            professional: professionalName,
            otherTime: otherTime
        };
    }
}