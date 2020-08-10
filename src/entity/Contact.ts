import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  JoinTable,
  UpdateDateColumn,
  ManyToMany,
} from 'typeorm'
import { User } from './User'
import { Message } from './Message'
import { Organisation } from './Organisation'

@Entity()
export class Contact {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  firstName: string

  @Column()
  lastName: string

  @Column({ nullable: true })
  email: string

  @Column({ nullable: true })
  phone: string

  @CreateDateColumn()
  createdAt: Date

  @Column({ nullable: true })
  role: string

  @Column({ nullable: true })
  notes: string

  @Column({ nullable: true })
  point: boolean

  @UpdateDateColumn()
  updatedAt: Date

  @ManyToMany((type) => Message, (message) => message.contacts)
  messages: Message[]

  @ManyToMany((type) => Organisation, (organisation) => organisation.contacts)
  @JoinTable()
  organisations: Organisation[]
}
