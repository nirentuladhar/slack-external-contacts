import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  JoinTable,
  UpdateDateColumn,
  ManyToOne,
  ManyToMany,
} from 'typeorm'
import { User } from './User'
import { Message } from './Message'

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

  @Column({ nullable: true })
  organisation: string

  @CreateDateColumn()
  createdAt: Date

  @Column({ nullable: true })
  notes: string

  @UpdateDateColumn()
  updatedAt: Date

  @ManyToMany((type) => Message, (message) => message.contacts)
  @JoinTable()
  messages: Message[]
}
