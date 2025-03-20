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
            const response = await fetch(fallbackUrl);
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
        // Get current appointments and available times
        const appointments = await this.getAppointments();
        const availableTimes = await this.#loadAvailableTimes();
        // Find the time slot to book
        const timeSlot = availableTimes.find(slot => 
            this.#convertScheduleToDateTime(datetime, slot.schedule).toISOString() === datetime.toISOString()
        );

        if (!timeSlot) {
            throw new Error('Time slot not available');
        }
        const professionals = await this.getProfessionals();
        // Create new appointment
        const newAppointment = {
            id: crypto.randomUUID(),
            datetime,
            professional: professionals.find(professional =>
                professional.id === professionalId
            ),
            schedule: timeSlot.schedule
        };


        // Update appointments
        appointments.push(newAppointment);
        await this.#saveStorageData(STORAGE_KEYS.AGENDA, appointments);

        // Remove booked time from available times
        const updatedTimes = availableTimes.filter(slot => 
            this.#convertScheduleToDateTime(datetime, slot.schedule).toISOString() !== datetime.toISOString()
        );

        await this.#saveStorageData(
            STORAGE_KEYS.AVAILABLE_TIMES, 
            { available: updatedTimes }
        );

        return newAppointment;
    }

    async cancelAppointment(appointmentId) {
        // Get current appointments
        const appointments = await this.getAppointments();
        const appointment = appointments.find(apt => apt.id === appointmentId);

        if (!appointment) {
            throw new Error('Appointment not found');
        }

        // Get available times
        const availableTimes = await this.#loadAvailableTimes();

        // Create time slot to return to available times
        const returnedTimeSlot = {
            schedule: appointment.schedule,
            professionals: [appointment.professionalId]
        };

        // Update available times
        availableTimes.push(returnedTimeSlot);
        await this.#saveStorageData(
            STORAGE_KEYS.AVAILABLE_TIMES, 
            { available: availableTimes }
        );

        // Remove appointment
        const updatedAppointments = appointments.filter(apt => apt.id !== appointmentId);
        await this.#saveStorageData(STORAGE_KEYS.AGENDA, updatedAppointments);

        return true;
    }

    async getAppointments() {
        return (await this.#getStorageData(STORAGE_KEYS.AGENDA)).sort((a, b) => a.datetime - b.datetime);
    }

    #convertScheduleToDateTime(date, schedule) {
        const dateObj = new Date(date);
        const hours = Math.floor(schedule / 60);
        const minutes = schedule % 60;
        dateObj.setHours(hours, minutes, 0, 0);
        return dateObj;
    }

    async getAgenda({ datetime, professionalId }) {
        const professionals = await this.getProfessionals();
        const availableTimes = await this.#loadAvailableTimes(professionalId);
        
        const allSlots = availableTimes.map(slot => ({
            datetime: this.#convertScheduleToDateTime(datetime, slot.schedule),
            professionals: slot.professionals.find(id =>
                professionals.find(p => p.id === id)
            )
        }));

        const chosenSlot = allSlots.find(item => 
            item.datetime.toISOString() === datetime.toISOString()
        );
        const isAvailable = !!chosenSlot;
       
        return {
            available: isAvailable,
            professional: professionalId 
                ? professionals.find(p => p.id === professionalId)?.name 
                : null,

            otherTime: isAvailable ? null : allSlots[0].datetime.toLocaleString()
        };
    }
}   