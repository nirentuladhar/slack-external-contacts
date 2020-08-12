import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
} from 'typeorm'
import { Contact } from './Contact'
import { Organisation } from './Organisation'

@Entity()
export class ProgramArea {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  name: string

  @Column({ nullable: true })
  notes: string

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date

  @ManyToMany((type) => Organisation, (organisation) => organisation.programs)
  organisations: Organisation[]

  @ManyToMany((type) => Contact, (contact) => contact.programs)
  contacts: Contact[]
}
