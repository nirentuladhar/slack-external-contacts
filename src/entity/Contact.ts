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

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @ManyToMany((type) => Message, (message) => message.contacts)
  @JoinTable()
  messages: Message[]
}
