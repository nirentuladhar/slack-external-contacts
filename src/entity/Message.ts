import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  JoinTable,
  UpdateDateColumn,
  ManyToMany,
  ManyToOne,
} from 'typeorm'
import { User } from './User'
import { Contact } from './Contact'

@Entity()
export class Message {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  text: string

  @Column()
  channelID: string

  @Column()
  ts: string

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date

  @ManyToOne((type) => User, (user) => user.messages)
  user: User

  @ManyToMany((type) => Contact, (contact) => contact.messages)
  @JoinTable()
  contacts: Contact[]
}
