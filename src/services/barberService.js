
const storageKeys = {
    professionals: 'trimly-professionals',
    availableTimes: 'trimly-available-times',
    agenda: 'trimly-agenda'
}

const dataFiles = {
    professionals: '/src/config/mockProfessionals.json',
    availableTimes: '/src/config/mockData.json'
}

export class BarberService {
    constructor() {
        this.barber = null;
        this.professionals = []
    }
    
    registerAvailableProfessionals() { }
    
    async getProfessionals() {
        if (this.professionals.length) { return this.professionals }

        if (!localStorage.getItem(storageKeys.professionals)) {
            localStorage.setItem(
                storageKeys.professionals,
                JSON.stringify(await (await fetch(dataFiles.professionals)).json())
            )
        }

        this.professionals = JSON.parse(localStorage.getItem(storageKeys.professionals))

        return this.professionals
    }

    async #loadAvailableTimesMock(professionalId) {
        if (!localStorage.getItem(storageKeys.availableTimes)) {
            localStorage.setItem(
                storageKeys.availableTimes,
                    JSON.stringify(await (await fetch(dataFiles.availableTimes)).json())
            )
        }
        const all = JSON.parse(localStorage.getItem(storageKeys.availableTimes))
        if (professionalId) {
            return all.available.filter(time => time.professionals.includes(professionalId))
        }

        return all.available
    }


    scheduleAppointment() { }

    getAppointments() {
        const appointments = localStorage.getItem(storageKeys.agenda)
        if (!appointments) {
            localStorage.setItem(storageKeys.agenda, JSON.stringify([]))
        }
        return JSON.parse(appointments) || []
     }

    cancelAppointment() { }

    // async getBarberAvailability({ datetime, professionalId }) {
    //     const availableTimes = await this.#loadAvailableTimesMock()
    //     const availableTime = availableTimes.find(time => time.datetime === datetime)
    //     return availableTime
    // }

    // Convert schedule (in minutes) to a Date object with date and time
    #convertScheduleToDateTime(date, schedule) {
        const dateObj = new Date(date);
        const hours = Math.floor(schedule / 60);
        const minutes = schedule % 60;
        dateObj.setHours(hours, minutes, 0, 0); // Set hours and minutes to date
        return dateObj;
    }

    formatter = new Intl.DateTimeFormat('en-CA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });

    async getAgenda({ datetime, professionalId }) {
        const professionals = await this.getProfessionals()
        // const data = this.formatter.format(datetime)
        const availableTimes = await this.#loadAvailableTimesMock(professionalId)
        const all = availableTimes.map(slot => {
            return {
                datetime: this.#convertScheduleToDateTime(datetime, slot.schedule),
                professionals: slot.professionals.map(id =>
                    professionals.find(p => p.id === id)
                )
            }
        })

        const chosen = all.find(item => item.datetime.toISOString() === datetime.toISOString())
        // Return the schedule as a Date object
        return {
            professional: professionalId ? professionals.find(p => p.id === professionalId).name : null,
            chosen,
            // todo: return the closest available time to the chosen one
            otherTime: all[0]
        }
    }
}   