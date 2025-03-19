export default class Service {
    constructor() {
        this.professionals = [
            { name: 'João Pedro', id: 609421 },
            { name: 'Luciano Silveira', id: 460164 },
            { name: 'Kauan Lopez', id: 936183 },
        ]
    }

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

        const data = this.formatter.format(datetime)
        const url = `https://api.avec.beauty/salao/78548/agenda/servico/2215874?data=${data}`
            .concat(professionalId ? `&profissional_id=${professionalId}` : '')

        const res = await ((await fetch(url)).json())
        const all = res.data.available?.map(slot => {
            return {
                datetime: this.#convertScheduleToDateTime(datetime, slot.schedule),
                professionals: slot.professionals.map(id =>
                    this.professionals.find(p => p.id === id)
                )
            }
        })
        const chosen = all.find(item => item.datetime.toISOString() === datetime.toISOString())
        // Return the schedule as a Date object
        return {
            professional: professionalId ? this.professionals.find(p => p.id === professionalId).name : null,
            chosen,
            // todo: return the closest available time to the chosen one
            otherTime: all[0]
        }
    }
}
